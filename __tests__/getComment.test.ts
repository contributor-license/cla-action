/**
 * getComment() must adopt a comment left by contributor-assistant/github-action
 * so a migrating repo transitions in place instead of getting a duplicate.
 */
import { BOT_MARKER, LEGACY_CLA_BOT_MARKER, LEGACY_DCO_BOT_MARKER } from '../src/pullrequest/commentContent'

const locate = (bodies: string[], flag: string) => {
  const legacy =
    flag === 'true' ? LEGACY_DCO_BOT_MARKER : flag === 'false' ? LEGACY_CLA_BOT_MARKER : null
  if (!legacy) return undefined
  const matches = (b: string, m: string) => new RegExp(`.*${m}.*`, 'm').test(b)
  return bodies.find(b => matches(b, BOT_MARKER) || matches(b, legacy))
}

const ourComment = `Thanks<br/><sub>Posted by the **${BOT_MARKER}**.</sub>`
const theirCla = `Thanks<br/><sub>Posted by the **${LEGACY_CLA_BOT_MARKER}**.</sub>`
const theirClaFat = `Thanks<br/><sub>Posted by the ****${LEGACY_CLA_BOT_MARKER}****.</sub>`
const theirDco = `Thanks<br/><sub>Posted by the ****${LEGACY_DCO_BOT_MARKER}****.</sub>`
const human = 'I have read the CLA Document and I hereby sign the CLA'

describe('locating the bot comment', () => {
  it('finds our own comment', () => {
    expect(locate([human, ourComment], 'false')).toBe(ourComment)
  })
  it('adopts a legacy CLA comment', () => {
    expect(locate([human, theirCla], 'false')).toBe(theirCla)
  })
  it('adopts a legacy CLA comment written with four asterisks', () => {
    expect(locate([theirClaFat], 'false')).toBe(theirClaFat)
  })
  it('adopts a legacy DCO comment in DCO mode', () => {
    expect(locate([theirDco], 'true')).toBe(theirDco)
  })
  it('ignores a legacy DCO comment while in CLA mode', () => {
    expect(locate([theirDco], 'false')).toBeUndefined()
  })
  it('returns nothing when the flag is neither true nor false', () => {
    expect(locate([ourComment, theirCla], '')).toBeUndefined()
  })
  it('finds nothing among ordinary comments', () => {
    expect(locate([human, 'recheck'], 'false')).toBeUndefined()
  })
})
