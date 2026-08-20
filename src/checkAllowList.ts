import * as core from '@actions/core'
import { CommittersDetails } from './interfaces'
import * as input from './shared/getInputs'

/** Local escapeRegExp; upstream pulled in lodash for this one function. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function patternToRegExp(pattern: string): RegExp {
  // Upstream semantics, replicated exactly: escape, then turn each literal
  // `*` back into `.*`. Deliberately NOT anchored - see SPEC.md section 7.
  // `bot*` becomes /bot.*/ and matches anywhere, which is the only reason
  // `bot*` exempts `dependabot[bot]`. Anchoring breaks every migrating repo.
  return new RegExp(escapeRegExp(pattern).split('\\*').join('.*'))
}

export function isAllowListed(login: string): boolean {
  const patterns = input.getAllowListItem().split(',')

  return patterns.some(raw => {
    const pattern = raw.trim()
    if (!pattern) return false

    if (!pattern.includes('*')) return pattern === login

    const matched = patternToRegExp(pattern).test(login)

    // Surface over-matching without changing the outcome: warn when the login
    // only matched because the pattern is unanchored.
    if (matched && !new RegExp(`^${escapeRegExp(pattern).split('\\*').join('.*')}$`).test(login)) {
      core.warning(
        `allowlist pattern "${pattern}" exempted "${login}" by partial match. ` +
          `Wildcards are unanchored, so "${pattern}" matches anywhere in a login.`
      )
    }
    return matched
  })
}

export function checkAllowList(committers: CommittersDetails[]): CommittersDetails[] {
  return committers.filter(committer => committer && !isAllowListed(committer.name))
}
