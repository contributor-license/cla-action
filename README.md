# Contributor License

CLA and DCO signing checks on pull requests. Contributors sign by commenting;
signatures are stored as JSON **in your own repository**, not on anyone's server.

Drop-in replacement for [`contributor-assistant/github-action`][archived], which
was archived on 2026-03-23. Migration is a one-line change and your existing
signature file keeps working — nobody re-signs. See [Migrating](#migrating).

[archived]: https://github.com/contributor-assistant/github-action

## Quick start

Add `.github/workflows/cla.yml`:

```yaml
name: CLA

on:
  issue_comment:
    types: [created]
  pull_request_target:
    types: [opened, closed, synchronize]

permissions:
  actions: write
  contents: write        # 'read' is enough if signatures live in a remote repo
  pull-requests: write
  statuses: write

jobs:
  CLAAssistant:
    runs-on: ubuntu-latest
    steps:
      - uses: contributor-license/cla-action@v1
        if: |
          github.event_name == 'pull_request_target' ||
          github.event.comment.body == 'recheck' ||
          github.event.comment.body == 'I have read the CLA Document and I hereby sign the CLA'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          path-to-signatures: signatures/version1/cla.json
          path-to-document: https://github.com/<org>/<repo>/blob/main/CLA.md
          branch: main
          allowlist: dependabot[bot],bot*
```

Then commit a CLA document somewhere and point `path-to-document` at it.
[`CLA.md`](CLA.md) in this repository is a reasonable starting shape — have a
lawyer read it before you rely on it.

## How it works

1. A pull request opens. The action collects every committer on it.
2. Anyone not already in the signature file, and not allowlisted, is asked to
   sign in a pull request comment.
3. A contributor comments the sign phrase. The action appends them to the
   signature file and commits it.
4. Once every committer has signed, the job passes.

The check is the **job itself** — no separate commit status is created. Pin the
job name in branch protection, not a status context.

> **The signature branch must not be protected.** The action commits the
> signature file directly. If the branch is protected, the write fails.

## Inputs

| Input | Default | Description |
| --- | --- | --- |
| `path-to-signatures` | `./signatures/cla.json` | Where signatures are stored |
| `branch` | `master` | Branch holding the signature file |
| `path-to-document` | — | URL of the document being signed |
| `allowlist` | `""` | Comma-separated logins exempt from signing. `*` wildcards |
| `remote-repository-name` | — | Store signatures in another repo. Needs `PERSONAL_ACCESS_TOKEN` |
| `remote-organization-name` | — | Owner of that repo |
| `use-dco-flag` | `false` | `true` swaps all CLA wording for DCO |
| `lock-pullrequest-aftermerge` | `true` | Lock the PR after merge so signatures can't be revoked |
| `suggest-recheck` | `true` | Mention `recheck` in the bot comment |
| `signed-commit-message` | — | `$contributorName` `$pullRequestNo` `$owner` `$repo` |
| `create-file-commit-message` | — | Message used when seeding the file |
| `custom-notsigned-prcomment` | — | Opening line asking for a signature. `$you` |
| `custom-allsigned-prcomment` | — | Comment once everyone has signed |
| `custom-pr-sign-comment` | — | Replace the sign phrase. Matched as exact lowercase equality |
| `empty-commit-flag` | `false` | Accepted, inert. Declared for compatibility |
| `signed-empty-commit-message` | — | Accepted, inert. Declared for compatibility |

### Two defaults worth reading twice

Both are inherited deliberately, because changing them would break migrations:

- **`path-to-signatures` defaults to `./signatures/cla.json`** — but the
  original project's README example used `signatures/version1/cla.json`, so most
  existing workflows set that explicitly. Both work. Set it explicitly.
- **`branch` defaults to `master`, not `main`.** If your default branch is
  `main`, set `branch: main` or the action reads and writes the wrong place.

### Environment

| Variable | When |
| --- | --- |
| `GITHUB_TOKEN` | always |
| `PERSONAL_ACCESS_TOKEN` | only for remote signature storage, or to re-run failed workflows. Needs `repo` scope |

## Allowlist

Comma-separated. Entries without `*` match exactly. Entries with `*` are
substring patterns, **not** anchored globs:

| Pattern | Matches |
| --- | --- |
| `octocat` | `octocat` only |
| `bot*` | anything **containing** `bot` — `dependabot[bot]`, `greenkeeper[bot]`, and also `robot123` |
| `*bot*` | same as above |

`bot*` exempting `dependabot[bot]` depends on that substring behavior —
`dependabot[bot]` does not start with `bot`. This is inherited exactly, because
anchoring it would silently start requiring signatures from bots in every
migrating repository.

Over-matches are logged as warnings so you can spot a pattern that is broader
than you intended. List bots explicitly if you want to be precise:
`allowlist: dependabot[bot],renovate[bot]`.

## DCO mode

Set `use-dco-flag: true` and all wording switches to the
[Developer Certificate of Origin](https://developercertificate.org). The sign
phrase becomes `I have read the DCO Document and I hereby sign the DCO`.

Note this signs via a pull request comment, not the conventional
`Signed-off-by:` commit trailer. Inherited behavior.

> `use-dco-flag` is three-state, not boolean. `true` means DCO, `false` means
> CLA, and **any other value means no comment ever counts as a signature**.
> Leave it unset (the default supplies `false`) or set it to exactly `true` or
> `false`.

## Signature file

```json
{
  "signedContributors": [
    {
      "name": "octocat",
      "id": 583231,
      "comment_id": 1409499803,
      "created_at": "2026-08-20T10:11:12Z",
      "repoId": 551374215,
      "pullRequestNo": 42
    }
  ]
}
```

Two-space indent, no trailing newline, appended never sorted. Contributors are
matched on the numeric `id`, so a login rename does not invalidate a signature.
Unknown top-level keys are preserved untouched.

The format is byte-compatible with the original and verified against 491 real
signatures from six public repositories.

## Migrating

Change one line, whichever way you pinned it:

```diff
-      - uses: contributor-assistant/github-action@v2.6.1
-      - uses: contributor-assistant/github-action@v2
-      - uses: contributor-assistant/github-action@ca4a40a7d1004f18d9960b404b97e5f30a505a08
+      - uses: contributor-license/cla-action@v1
```

Nothing else changes. Your signature file, inputs, permissions and workflow
triggers all stay as they are, and no contributor signs again.

On the first run the bot adopts its existing comment on each open pull request
and rewrites it in place, so no duplicate comment appears.

### What differs

Three things, none of which affect a repository that is already running the
original:

| | Original | Here |
| --- | --- | --- |
| Bot comment marker | `CLA Assistant Lite bot` | `Contributor License bot`. The old marker is still recognized, so existing comments are adopted rather than duplicated |
| Missing signature file | Failed with `Could not retrieve repository contents. Status: 404` — a status comparison bug meant the file was never seeded | Seeded, as the original documented. Only reachable when no signature file exists |
| Seeded file indent | 3 spaces, reformatted to 2 on the first signature | 2 from the start. Same unreachable path |

Everything else is replicated exactly, including known bugs, because changing
them would change behavior on migration. They are cataloged in
[`SPEC.md`](SPEC.md).

### Known inherited limits

| Limit | Effect |
| --- | --- |
| Only the first 100 commits of a pull request are inspected | Committers beyond that are not asked to sign. A warning is logged |
| Only the first page of pull request comments is read | On a very long thread a signature comment can be missed. Comment `recheck` |
| Committers are de-duplicated by login | A contributor who renames mid-pull-request can appear twice |

## Known limitations

Inherited from the original action and replicated on purpose, because changing
them would break repositories migrating across. All are tracked in
[ROADMAP.md](ROADMAP.md).

| | Effect |
| --- | --- |
| Commit authorship is not verified against the pull request opener | Someone can open a pull request whose commits are attributed to a person who already signed, and the check passes without them signing. A `require-opener-as-author` guard is planned |
| `Co-authored-by:` trailers are not parsed | Co-authors are never asked to sign |
| Only the first 100 commits are inspected | Committers beyond that are not asked to sign. A warning is logged |
| Only the first page of comments is read | On a long thread a signature comment can be missed. Comment `recheck` |
| Committers are de-duplicated by login | A contributor who renames mid-pull-request can appear twice |

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md). Contributions are accepted under the
[CLA](CLA.md) — this project checks its own pull requests with itself.

## License

[Apache-2.0](LICENSE). Derived from
[`contributor-assistant/github-action`](https://github.com/contributor-assistant/github-action)
(Copyright SAP SE and contributors, Apache-2.0), whose full history is preserved
on the `upstream` branch. Not affiliated with or endorsed by SAP SE. See
[`NOTICE`](NOTICE).
