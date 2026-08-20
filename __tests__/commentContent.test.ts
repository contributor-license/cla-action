import {
  BOT_MARKER,
  LEGACY_CLA_BOT_MARKER,
  LEGACY_DCO_BOT_MARKER,
  commentContent
} from '../src/pullrequest/commentContent'
import { CommitterMap } from '../src/interfaces'

const setDco = (v: string) => { process.env['INPUT_USE-DCO-FLAG'] = v }
const map = (signed: number, notSigned: number): CommitterMap => ({
  signed: Array.from({ length: signed }, (_, i) => ({ name: `s${i}`, id: i + 1 })),
  notSigned: Array.from({ length: notSigned }, (_, i) => ({ name: `n${i}`, id: 100 + i })),
  unknown: []
})

describe('comment content', () => {
  afterEach(() => {
    delete process.env['INPUT_USE-DCO-FLAG']
    delete process.env['INPUT_SUGGEST-RECHECK']
  })

  it('writes our marker, never the legacy ones', () => {
    setDco('false')
    for (const signed of [true, false]) {
      const body = commentContent(signed, map(1, signed ? 0 : 1))
      expect(body).toContain(BOT_MARKER)
      expect(body).not.toContain(LEGACY_CLA_BOT_MARKER)
      expect(body).not.toContain(LEGACY_DCO_BOT_MARKER)
    }
  })

  it('writes our marker in DCO mode too', () => {
    setDco('true')
    const body = commentContent(false, map(0, 1))
    expect(body).toContain(BOT_MARKER)
    expect(body).not.toContain(LEGACY_DCO_BOT_MARKER)
  })

  it('renders the CLA sign phrase and document wording', () => {
    setDco('false')
    const body = commentContent(false, map(0, 1))
    expect(body).toContain('I have read the CLA Document and I hereby sign the CLA')
    expect(body).toContain('Contributor License Agreement')
  })

  it('renders the DCO sign phrase and document wording', () => {
    setDco('true')
    const body = commentContent(false, map(0, 1))
    expect(body).toContain('I have read the DCO Document and I hereby sign the DCO')
    expect(body).toContain('Developer Certificate of Origin')
  })

  it('uses singular "you" for one committer and "you all" for several', () => {
    setDco('false')
    expect(commentContent(false, map(0, 1))).toContain('we ask that you sign')
    expect(commentContent(false, map(1, 1))).toContain('we ask that you all sign')
  })

  it('shows the signed/total tally only when more than one committer', () => {
    setDco('false')
    expect(commentContent(false, map(0, 1))).not.toContain('out of')
    expect(commentContent(false, map(1, 2))).toContain('**1** out of **3** committers')
  })

  it('suppresses the recheck hint when suggest-recheck is not true', () => {
    setDco('false')
    process.env['INPUT_SUGGEST-RECHECK'] = 'true'
    expect(commentContent(false, map(0, 1))).toContain('recheck')
    process.env['INPUT_SUGGEST-RECHECK'] = 'false'
    expect(commentContent(false, map(0, 1))).not.toContain('commenting **recheck**')
  })
})
