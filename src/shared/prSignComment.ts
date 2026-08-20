import * as input from './getInputs'

export const DEFAULT_SIGN_PHRASE =
  'I have read the CLA Document and I hereby sign the CLA'

export const RECHECK_PHRASE = 'recheck'

export function getPrSignComment(): string {
  return input.getCustomPrSignComment() || DEFAULT_SIGN_PHRASE
}
