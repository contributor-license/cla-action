import * as core from '@actions/core'

const setAllowlist = (v: string) => { process.env['INPUT_ALLOWLIST'] = v }

import { isAllowListed, checkAllowList } from '../src/checkAllowList'

describe('allowlist matching (upstream-compatible, unanchored)', () => {
  beforeEach(() => { jest.restoreAllMocks() })
  afterEach(() => { delete process.env['INPUT_ALLOWLIST'] })

  // SPEC.md section 7 - these MUST match the archived action exactly.
  const cases: Array<[string, string, boolean]> = [
    ['bot*', 'dependabot[bot]', true],   // load-bearing: only works unanchored
    ['bot*', 'greenkeeper[bot]', true],
    ['bot*', 'robot123', true],          // over-match, replicated on purpose
    ['bot*', 'mybotnet', true],
    ['bot*', 'botuser', true],
    ['bot*', 'octocat', false],
    ['*bot*', 'dependabot[bot]', true],
    ['dependabot[bot]', 'dependabot[bot]', true],
    ['octocat', 'octocat', true],
    ['octocat', 'octocat2', false],      // no wildcard => exact match
    ['', 'octocat', false],
  ]

  test.each(cases)('pattern %p vs login %p -> %p', (pattern, login, expected) => {
    setAllowlist(pattern)
    expect(isAllowListed(login)).toBe(expected)
  })

  it('splits and trims comma-separated patterns', () => {
    setAllowlist(' alice , bob ,bot* ')
    expect(isAllowListed('alice')).toBe(true)
    expect(isAllowListed('bob')).toBe(true)
    expect(isAllowListed('dependabot[bot]')).toBe(true)
    expect(isAllowListed('carol')).toBe(false)
  })

  it('warns on partial match without changing the outcome', () => {
    setAllowlist('bot*')
    const warn = jest.spyOn(core, 'warning').mockImplementation(() => {})
    expect(isAllowListed('robot123')).toBe(true)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('partial match'))
  })

  it('does not warn on a full match', () => {
    setAllowlist('bot*')
    const warn = jest.spyOn(core, 'warning').mockImplementation(() => {})
    expect(isAllowListed('botuser')).toBe(true)
    expect(warn).not.toHaveBeenCalled()
  })

  it('filters allowlisted committers out', () => {
    setAllowlist('bot*')
    const out = checkAllowList([
      { name: 'octocat', id: 1 },
      { name: 'dependabot[bot]', id: 2 }
    ])
    expect(out).toEqual([{ name: 'octocat', id: 1 }])
  })
})
