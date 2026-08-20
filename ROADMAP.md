# Roadmap

What is planned and roughly in what order. Dates are deliberately absent; the
order is the commitment, not a schedule.

Open an issue if something here matters to you, or if something that matters to
you is missing. Priorities move based on what people actually hit.

## Now — v1.x

Backwards compatible. v1 is a drop-in replacement for
`contributor-assistant/github-action`, and nothing in this section changes
observable behavior unless you opt in.

### Co-author signatures

`Co-authored-by:` trailers are not parsed today, so a co-author is never asked
to sign and never appears in the signature file. They contributed code; they
should be covered.

Inherited from upstream. Adding them changes who is asked to sign, so it lands
behind an input first and becomes the default in v2.

### Impersonation guard — `require-opener-as-author`

Git commit authorship is not authenticated. Anyone can set `user.email` to an
address belonging to someone who has already signed, push, and open a pull
request. The commits resolve to that person's GitHub account, their existing
signature satisfies the check, and the person who actually opened the pull
request is never asked to sign anything.

The result is code merged with no valid grant from whoever really wrote it,
which is the one thing a CLA exists to prevent.

The fix is to require that the pull request **opener**, whose identity GitHub
does authenticate, appears as an author or co-author of at least one commit.

Some workflows legitimately have an opener who authored nothing: cherry-picks,
release engineering, and mailing-list style patch submission. So:

| Version | Default | Behavior |
| --- | --- | --- |
| v1.x | `false` | Off by default. A warning is logged when the opener authored nothing, so the case is visible either way |
| v2.0 | `true` | On by default. Opt out for workflows that need it |

The warning ships at the same time as the input, so repositories see the
situation immediately without anything breaking on upgrade.

Credit: this guard was implemented first in
[`iainmcgin/cla-github-action`](https://github.com/iainmcgin/cla-github-action),
a fork maintained independently of this one.

### Commit status for branch protection

The check currently reports as the workflow job, which works when a pull request
event triggers it but not when a run is triggered by the signing comment.
`issue_comment` runs are not associated with the head commit, so they produce no
check on the pull request.

That makes the CLA check unreliable as a **required** status in branch
protection, which is exactly where most people want it.

Emitting a real commit status on the head SHA fixes it. The context name will be
configurable, defaulting to something distinct from the hosted
`cla-assistant.io` service so the two never collide in a repository migrating
between them.

### Pagination

Only the first 100 commits of a pull request and the first page of comments are
read. Beyond that, committers are missed and signing comments can go unseen.
Both are inherited, both currently emit warnings, both should simply work.

Fixing this makes the check *stricter* — more committers found means more
signatures required. It is a bug fix, not a behavior change, but it will be
called out in release notes because a previously passing pull request can start
failing.

## Next — v2.0

The first release allowed to change defaults. Every change here exists in v1.x
first as an opt-in input, so nothing arrives unannounced.

- `require-opener-as-author` defaults to `true`
- Co-author signatures required by default
- `strict-allowlist` — anchored wildcard matching. Today `bot*` matches anywhere
  in a login, so it exempts `robot123` as well as `dependabot[bot]`. Anchoring
  is correct but would require every migrating repository to rewrite the pattern
  as `*bot*`, so it waits for a major version
- Drop the read-side match for the legacy `CLA Assistant Lite bot` comment
  marker, once migrations from the archived action have tailed off

## Later — hosted service

A GitHub App and a dashboard, for teams who would rather not run the action
themselves. Sign once per organization instead of once per repository, an
org-wide view of who signed what and when, and CLA versioning so it is
unambiguous which text a signature was given against.

**This action stays free, self-hosted, and fully supported.** Signatures living
in your own repository is the property that keeps this path free of third-party
data custody, and it is not going away. The hosted service is an option, never a
requirement, and this action will not be degraded to make it more attractive.

Export will exist from the first day the service does. Your signature records
have to be portable out of it on demand, or it should not hold them.

### How it gets funded

Being honest about this early rather than surprising anyone later.

The hosted service is intended to have a paid tier, most likely aimed at private
repositories and larger organizations. Public and open source repositories are
intended to remain free on the hosted service as well.

Nothing about the pricing is decided, so there is nothing more specific to say
yet. What is decided is the part above: the action is free, and the paid tier
will not be built by removing things from it.

## Not planned

- **Replacing the `Signed-off-by:` trailer for DCO.** DCO mode signs by pull
  request comment, inherited from upstream. The commit trailer is the
  conventional mechanism and is worth supporting eventually, but it is a
  different flow rather than a change to this one.
- **A web UI in this action.** Signing happens in the pull request. That is the
  whole point of it.
- **Storing signatures anywhere by default.** They live in your repository.
