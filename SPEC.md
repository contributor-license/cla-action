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

Anything here is a knowing break from the original and must be in release notes.

### Allowlist wildcards get anchored — SECURITY

`src/checkAllowList.ts` builds `new RegExp(escapeRegExp(pattern).split('\\*').join('.*'))`
and calls `.test(committer)` with **no anchors**. So the pattern `bot*` compiles
to `/bot.*/` and matches anywhere in the login:

| Pattern | Login | Original | v1 |
| --- | --- | --- | --- |
| `bot*` | `dependabot[bot]` | exempt | exempt |
| `bot*` | `robot123` | **exempt** | must sign |
| `bot*` | `mybotnet` | **exempt** | must sign |

An unanchored allowlist silently exempts contributors who were meant to sign,
which defeats the point of having a CLA at all. v1 anchors to `^...$`.

This can change behaviour on migration, so: log loudly at runtime when a login
matches unanchored-but-not-anchored, naming the pattern and the login, and
document it as the one intentional behavioural break.

### Dead comparison dropped

`checkAllowList` tests `isUserNotInAllowList !== undefined` — a function
reference compared to undefined, always true. Reduces to the plain call. Also
note the name is inverted: it returns true when the user **is** in the allowlist.

## 8. Test corpus

Compatibility is not a claim, it is a test. Before v1 ships:

1. Real `signedContributors` files from public repos using the archived action,
   committed as fixtures.
2. Round-trip test: read fixture → append one signature → assert the diff is
   exactly the added entry, byte for byte, including indentation.
3. Every input at its default, then at its README-example value.
4. Allowlist matrix from the table above.
5. Both magic phrases, plus a custom `custom-pr-sign-comment`.
