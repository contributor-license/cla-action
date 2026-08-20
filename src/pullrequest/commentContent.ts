import { CommitterMap } from '../interfaces'
import * as input from '../shared/getInputs'
import { getPrSignComment } from '../shared/prSignComment'

/**
 * Marker written into every comment we post. getComment() locates the bot's
 * previous comment by marker, so this string is load-bearing.
 */
export const BOT_MARKER = 'Contributor License bot'

/**
 * Markers written by contributor-assistant/github-action. Matched on read only,
 * never written. A repo migrating from that action has an existing comment
 * carrying one of these; we find it, then rewrite it in place with BOT_MARKER,
 * so the comment transitions to ours without ever duplicating.
 */
export const LEGACY_CLA_BOT_MARKER = 'CLA Assistant Lite bot'
export const LEGACY_DCO_BOT_MARKER = 'DCO Assistant Lite bot'

export function commentContent(signed: boolean, committerMap: CommitterMap): string {
  return input.getUseDcoFlag() == 'true' ? body('DCO', signed, committerMap) : body('CLA', signed, committerMap)
}

function body(kind: 'CLA' | 'DCO', signed: boolean, committerMap: CommitterMap): string {
  const marker = BOT_MARKER
  const docName = kind === 'DCO' ? 'Developer Certificate of Origin' : 'Contributor License Agreement'

  if (signed) {
    const line1 = input.getCustomAllSignedPrComment() || `All contributors have signed the ${kind}  ✍️ ✅`
    return `${line1}<br/><sub>Posted by the **${marker}**.</sub>`
  }

  let committersCount = 1
  if (committerMap && committerMap.signed && committerMap.notSigned) {
    committersCount = committerMap.signed.length + committerMap.notSigned.length
  }

  const you = committersCount > 1 ? `you all` : `you`
  const lineOne = (
    input.getCustomNotSignedPrComment() ||
    `<br/>Thank you for your submission, we really appreciate it. Like many open-source projects, we ask that $you sign our [${docName}](${input.getPathToDocument()}) before we can accept your contribution. You can sign the ${kind} by just posting a Pull Request Comment same as the below format.<br/>`
  ).replace('$you', you)

  const signPhrase =
    kind === 'DCO'
      ? input.getCustomPrSignComment() || 'I have read the DCO Document and I hereby sign the DCO'
      : getPrSignComment()

  let text = `${lineOne}
   - - -
   ${signPhrase}
   - - -
   `

  if (committersCount > 1 && committerMap && committerMap.signed && committerMap.notSigned) {
    text += `**${committerMap.signed.length}** out of **${committerMap.signed.length + committerMap.notSigned.length}** committers have signed the ${kind}.`
    committerMap.signed.forEach(c => {
      text += `<br/>:white_check_mark: (${c.name})[https://github.com/${c.name}]`
    })
    committerMap.notSigned.forEach(c => {
      text += `<br/>:x: @${c.name}`
    })
    text += '<br/>'
  }

  if (committerMap && committerMap.unknown && committerMap.unknown.length > 0) {
    const seem = committerMap.unknown.length > 1 ? 'seem' : 'seems'
    const names = committerMap.unknown.map(c => c.name)
    text += `**${names.join(', ')}** ${seem} not to be a GitHub user.`
    text += ` You need a GitHub account to be able to sign the ${kind}. If you have already a GitHub account, please [add the email address used for this commit to your account](https://help.github.com/articles/why-are-my-commits-linked-to-the-wrong-user/#commits-are-not-linked-to-any-user).<br/>`
  }

  if (input.suggestRecheck() == 'true') {
    text += '<sub>You can retrigger this bot by commenting **recheck** in this Pull Request. </sub>'
  }

  text += `<sub>Posted by the **${marker}**.</sub>`
  return text
}
