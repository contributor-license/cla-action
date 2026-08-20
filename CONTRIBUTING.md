# Contributing

## Setup

```
npm ci
npm test          # jest
npm run lint
npx tsc --noEmit -p tsconfig.json
npm run build     # ncc -> dist/index.js
```

## Rebuild dist/ before you push

`action.yml` runs `dist/index.js`, not `src/`. A change to `src/` that is not
rebuilt ships stale code with a green test suite. CI rebuilds the bundle and
fails on any difference, so:

```
npm run build && git add dist/
```

## Compatibility is the product

v1 is a drop-in replacement for `contributor-assistant/github-action`.
[`SPEC.md`](SPEC.md) is the contract: signature file format, every input and its
real default, the comment protocol, and the complete list of intentional
divergences.

Before changing observable behavior, check SPEC.md. Several apparent bugs are
replicated on purpose — unanchored allowlist wildcards, the 100-commit ceiling,
the tri-state `use-dco-flag` — because a repository migrating from the original
would break if they were "fixed". Divergences belong behind an opt-in input, in
SPEC.md, and in the release notes.

Signature-format changes need a fixture round-trip test proving byte-identical
output. Fixtures in `__tests__/fixtures/` mirror real files from public
repositories with identities anonymized; keep them anonymized.

## Pull requests

- One change per pull request, and say what you tested against.
- Add tests. Compatibility claims without a test are not claims.
- Sign the [CLA](CLA.md) by commenting on your pull request:
  `I have read the CLA Document and I hereby sign the CLA`

This repository checks its own pull requests with its own action, pinned to the
released `@v1` rather than the working tree. That workflow runs on
`pull_request_target` with a write token, so it deliberately has no checkout
step - see the warning at the top of `.github/workflows/cla.yml` before changing
it. Testing against a pull request's own code belongs in `ci.yml`.

## Contribution terms

Contributions are accepted under the [CLA](CLA.md). In short: you keep your
copyright, and you grant a license broad enough for the project to be offered
under separate commercial terms. Full text and the reasoning are in `CLA.md`.
