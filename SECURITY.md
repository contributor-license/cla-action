# Security policy

## Reporting a vulnerability

Report privately via
[GitHub Security Advisories](https://github.com/contributor-license/cla-action/security/advisories/new),
or email anthony@linsday.net.

Please do not open a public issue for a security problem.

Expect an acknowledgment within a few days. Once a fix is available it ships in
a patch release and the advisory is published with credit, unless you would
rather not be named.

## Supported versions

| Version | Supported |
| --- | --- |
| `v1.x` | yes |

`@v1` tracks the latest v1.x release. Pinning to it means you pick up security
fixes automatically. Pinning to a full SHA means you do not — check back
periodically if you do.

## Threat model

This action runs on `pull_request_target` with a write-scoped `GITHUB_TOKEN`,
because it must comment on and commit to the base repository for pull requests
that originate from forks. That trigger is privileged by design, and the
following are the things most likely to go wrong.

**Never check out and execute pull request code in the CLA workflow.** A
workflow triggered by `pull_request_target` that checks out
`github.event.pull_request.head.sha` and runs anything from it — a build step, a
local action, a lifecycle script — executes a contributor's code with a write
token. That is a full repository compromise, and it looks like an ordinary
"make CI test the PR" change in review. Run untrusted code under
`pull_request` instead, which has no write access. See
`.github/workflows/cla.yml` in this repository for the shape to copy.

**Signatures are a record, not a secret.** They live in your repository and are
as trustworthy as write access to the branch holding them. Anyone who can push
to that branch can add or remove entries. If that matters to you, store
signatures in a separate private repository with
`remote-organization-name` / `remote-repository-name`.

**The signature branch cannot be protected.** The action commits directly to it.
That is a deliberate trade-off inherited from the original action, and it means
the branch is writable by the token.

**Identity is a GitHub account.** A signature records the numeric user id of the
account that posted the signing comment. It is evidence that an authenticated
account agreed, not proof of a legal identity behind that account.

**Commit authorship is not authenticated, and this action does not currently
compensate for that.** Git lets anyone set `user.email` to any address. If that
address belongs to a GitHub account which has already signed, the commits
resolve to that account and the check passes, even though the person who opened
the pull request never signed. The opener's identity, which GitHub does
authenticate, is not consulted today.

This is inherited from the original action. A `require-opener-as-author` guard
is on the [roadmap](ROADMAP.md), opt-in first and default in v2. Until then, if
this matters for your project, review the commit authorship on pull requests
from first-time contributors rather than relying on the check alone.

## Scope

Reports about behavior deliberately inherited from
`contributor-assistant/github-action` and documented in
[SPEC.md](SPEC.md) — unanchored allowlist wildcards, the 100-commit ceiling, the
single page of comments — are known and cataloged. They are still worth
reporting if you can show impact beyond what is described there.
