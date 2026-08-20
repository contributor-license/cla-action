import { CommitterMap } from '../interfaces'
import * as input from '../shared/getInputs'
import { getPrSignComment } from '../shared/prSignComment'

/**
 * Bot markers. getComment() locates its own previous comment by these literals,
 * so they are part of the drop-in contract: change them and a migrating repo's
 * existing comment stops being found and a duplicate is posted.
 */
export const CLA_BOT_MARKER = 'CLA Assistant Lite bot'
export const DCO_BOT_MARKER = 'DCO Assistant Lite bot'

export function commentContent(signed: boolean, committerMap: CommitterMap): string {
  return input.getUseDcoFlag() == 'true' ? body('DCO', signed, committerMap) : body('CLA', signed, committerMap)
}

function body(kind: 'CLA' | 'DCO', signed: boolean, committerMap: CommitterMap): string {
  const marker = kind === 'DCO' ? DCO_BOT_MARKER : CLA_BOT_MARKER
  const docName = kind === 'DCO' ? 'Developer Certificate of Origin' : 'Contributor License Agreement'

  if (signed) {
    const line1 = input.getCustomAllSignedPrComment() || `All contributors have signed the ${kind}  ✍️ ✅`
    return `${line1}<br/><sub>Posted by the ****${marker}****.</sub>`
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

  // Upstream emits 4 asterisks in the DCO path and 2 in the CLA path here.
  // Replicated verbatim; the locator regex tolerates either.
  text += kind === 'DCO'
    ? `<sub>Posted by the ****${marker}****.</sub>`
    : `<sub>Posted by the **${marker}**.</sub>`
  return text
}
