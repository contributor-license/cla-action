import { isCommentSignedByUser } from '../src/pullrequest/signatureComment'

const setDco = (v: string) => { process.env['INPUT_USE-DCO-FLAG'] = v }
const setCustom = (v: string) => { process.env['INPUT_CUSTOM-PR-SIGN-COMMENT'] = v }
const lower = (s: string) => s.trim().toLowerCase()

const CLA = 'I have read the CLA Document and I hereby sign the CLA'
const DCO = 'I have read the DCO Document and I hereby sign the DCO'

describe('signature phrase detection', () => {
  afterEach(() => {
    delete process.env['INPUT_USE-DCO-FLAG']
    delete process.env['INPUT_CUSTOM-PR-SIGN-COMMENT']
  })

  it('matches the CLA phrase when use-dco-flag is false', () => {
    setDco('false')
    expect(isCommentSignedByUser(lower(CLA), 'octocat')).toBe(true)
  })

  it('matches the DCO phrase when use-dco-flag is true', () => {
    setDco('true')
    expect(isCommentSignedByUser(lower(DCO), 'octocat')).toBe(true)
  })

  it('does not match the DCO phrase in CLA mode', () => {
    setDco('false')
    expect(isCommentSignedByUser(lower(DCO), 'octocat')).toBe(false)
  })

  // Upstream switch has no fallthrough: an unset flag matches nothing at all.
  it('matches nothing when use-dco-flag is neither true nor false', () => {
    setDco('')
    expect(isCommentSignedByUser(lower(CLA), 'octocat')).toBe(false)
    setDco('yes')
    expect(isCommentSignedByUser(lower(CLA), 'octocat')).toBe(false)
  })

  it('ignores comments authored by github-actions[bot]', () => {
    setDco('false')
    expect(isCommentSignedByUser(lower(CLA), 'github-actions[bot]')).toBe(false)
  })

  it('tolerates surrounding text', () => {
    setDco('false')
    expect(isCommentSignedByUser(lower(`Sure thing. ${CLA} thanks!`), 'octocat')).toBe(true)
  })

  it('requires the full phrase', () => {
    setDco('false')
    expect(isCommentSignedByUser(lower('I have read the CLA'), 'octocat')).toBe(false)
    expect(isCommentSignedByUser(lower('recheck'), 'octocat')).toBe(false)
  })

  it('uses exact lowercase equality when custom-pr-sign-comment is set', () => {
    setDco('false')
    setCustom('I agree to the terms')
    expect(isCommentSignedByUser('i agree to the terms', 'octocat')).toBe(true)
    expect(isCommentSignedByUser('well, i agree to the terms ok', 'octocat')).toBe(false)
    expect(isCommentSignedByUser(lower(CLA), 'octocat')).toBe(false)
  })
})
