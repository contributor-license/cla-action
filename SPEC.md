# v1 compatibility spec

v1 is a drop-in replacement for [`contributor-assistant/github-action`][archived]
(archived 2026-08-06, Apache-2.0). A user migrates by changing one `uses:` line.
Their existing signature file keeps validating, and nobody re-signs.

Everything below was read out of the archived source at `master`, not the README
— the two disagree in places, and those places are called out.

[archived]: https://github.com/contributor-assistant/github-action

## 1. Signature file

Written by `src/persistence/persistence.ts`.

```json
{
  "signedContributors": [
    {
      "name": "octocat",
      "id": 583231,
      "pullRequestNo": 42,
      "created_at": "2026-08-20T10:11:12Z",
      "updated_at": "2026-08-20T10:11:12Z",
      "comment_id": 998877,
      "body": "I have read the CLA Document and I hereby sign the CLA",
      "repoId": "1296269"
    }
  ]
}
```

- Top-level key is **`signedContributors`**. The whole file object is preserved
  on write — unknown sibling keys must round-trip untouched.
- Serialised with `JSON.stringify(content, null, 2)` — **two-space indent**.
  Anything else produces a noisy diff on every signature and will get noticed.
- Record shape is `CommittersDetails` (`src/interfaces.ts`). Only `name` and
  `id` are required; the rest are optional and must stay optional.
- New signatures are **appended** (`signedContributors.push(...)`). Never sort,
  never rewrite existing entries.

**Identity is `id`, not `name`.** GitHub logins can be renamed and the freed
login re-registered by someone else. Match on the numeric id; treat `name` as a
display label that may be stale.

## 2. Inputs

From `action.yml`. All 15 must exist with these exact names and defaults.

| Input | Default |
| --- | --- |
| `path-to-signatures` | `./signatures/cla.json` |
| `branch` | `master` |
| `allowlist` | `""` |
| `use-dco-flag` | `false` |
| `lock-pullrequest-aftermerge` | `true` |
| `suggest-recheck` | `true` |
| `path-to-document` | _(none)_ |
| `remote-repository-name` | _(none)_ |
| `remote-organization-name` | _(none)_ |
| `signed-commit-message` | _(none)_ |
| `signed-empty-commit-message` | _(none)_ |
| `create-file-commit-message` | _(none)_ |
| `custom-notsigned-prcomment` | _(none)_ |
| `custom-pr-sign-comment` | _(none)_ |
| `custom-allsigned-prcomment` | _(none)_ |

### Two defaults that are traps

- **`path-to-signatures` really defaults to `./signatures/cla.json`.** The
  README's example sets `signatures/version1/cla.json` explicitly, so most
  real-world workflows carry that value while the documented default is
  something else. Both paths must work; do not "correct" either.
- **`branch` really defaults to `master`.** The README example sets `main`.
  A repo that relied on the default is reading and writing `master`.

### Inputs the original disagrees with itself about

- `empty-commit-flag` is read by `src/shared/getInputs.ts` but is **not
  declared** in `action.yml`.
- `signed-empty-commit-message` is declared in `action.yml` but is **not read**
  by `getInputs.ts`.

Declare both, read both. Costs nothing and covers either belief.

## 3. Comment protocol

- Signing phrase, verbatim:
  `I have read the CLA Document and I hereby sign the CLA`
  Overridable per-repo via `custom-pr-sign-comment` (`src/shared/pr-sign-comment.ts`).
- `recheck` re-runs the check without signing.
- Both arrive as `issue_comment`, because GitHub models a PR as an issue.

## 4. Commit messages

Defaults, with placeholder substitution on the signed message:

- create: `Creating file for storing CLA Signatures`
- signed: `@$contributorName has signed the CLA in $owner/$repo#$pullRequestNo`

Placeholders: `$contributorName`, `$pullRequestNo`, `$owner`, `$repo`.

## 5. What it does NOT do

**No commit status is ever created.** There is no `createCommitStatus` call in
the archived source; pass/fail is signalled with `core.setFailed()`, which fails
the workflow job. The check name users pin in branch protection is therefore the
**job name in their own workflow file**, which we neither set nor need to match.

`license/cla` is the *hosted* cla-assistant.io status context. Unrelated to this
action. Do not emit it.

## 6. Storage location

`isRemoteRepoOrOrgConfigured()` — if either `remote-organization-name` or
`remote-repository-name` is set, all reads and writes use the
`PERSONAL_ACCESS_TOKEN` octokit; otherwise the built-in `GITHUB_TOKEN` octokit
against the current repo.

Signatures stay in the user's own repo. We never hold them. That property is
what keeps this action free of the record-custody and GDPR obligations the
hosted service will carry, and it should stay true.

## 7. Deliberate divergences

One, and it is cosmetic: the bot comment carries our marker instead of theirs.
Everything else is identical to the archived action, including its bugs.

### Bot comment marker

`getComment()` locates the bot's own previous comment by a literal string in the
body. Upstream writes and matches `CLA Assistant Lite bot` / `DCO Assistant Lite
bot`.

v1 **matches** ours *or* the mode-appropriate legacy marker, and **writes** only
`Contributor License bot`.

Migration is therefore in place and duplicate-free:

| Run | Existing comment | Found by | Rewritten as |
| --- | --- | --- | --- |
| first after migrating | `CLA Assistant Lite bot` | legacy marker | `Contributor License bot` |
| every run after | `Contributor License bot` | our marker | `Contributor License bot` |

The legacy markers are read-only and must never be written. Dropping the legacy
match would orphan the existing comment on every migrating repo and post a
duplicate, so it stays until v1 adoption is no longer a concern.

Upstream's 4-vs-2 asterisk inconsistency around the marker is not reproduced —
we always write two. The locator regex tolerates either, so adopting a legacy
comment written with four still works.

### Allowlist wildcards stay unanchored

`src/checkAllowList.ts` builds `new RegExp(escapeRegExp(pattern).split('\\*').join('.*'))`
and calls `.test(login)` with no anchors, so a pattern matches anywhere in the
login. This over-matches — but the over-match is load-bearing:

| Pattern | Login | Unanchored (upstream + v1) | Anchored |
| --- | --- | --- | --- |
| `bot*` | `dependabot[bot]` | exempt | must sign |
| `bot*` | `greenkeeper[bot]` | exempt | must sign |
| `bot*` | `robot123` | exempt | must sign |
| `bot*` | `botuser` | exempt | exempt |

The upstream README documents `allowlist: user1,bot*` for exempting bots.
`bot*` only exempts `dependabot[bot]` *because* matching is unanchored —
`dependabot[bot]` does not start with `bot`. Anchoring would require every
migrating repo to rewrite the pattern as `*bot*`, and until they did, dependabot
would be blocked on every pull request. Replicate exactly.

Log a warning when a login matches only by over-match (matches unanchored but
not anchored), naming pattern and login. Warning only — never changes the
outcome.

Anchored semantics may arrive in v2 as `strict-allowlist: true`, default off.

## 8. Test corpus

Compatibility is not a claim, it is a test. Before v1 ships:

1. Real `signedContributors` files from public repos using the archived action,
   committed as fixtures.
2. Round-trip test: read fixture → append one signature → assert the diff is
   exactly the added entry, byte for byte, including indentation.
3. Every input at its default, then at its README-example value.
4. Allowlist matrix from the table above.
5. Both magic phrases, plus a custom `custom-pr-sign-comment`.
