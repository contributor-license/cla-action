import { context } from '@actions/github'
import { CommitterMap, CommittersDetails, ReactedCommitterMap } from '../interfaces'
import { getDefaultOctokit } from '../octokit'
import { getUseDcoFlag } from '../shared/getInputs'
import { CLA_BOT_MARKER, DCO_BOT_MARKER, commentContent } from './commentContent'
import signatureWithPRComment from './signatureComment'

export default async function prCommentSetup(
  committerMap: CommitterMap,
  committers: CommittersDetails[]
): Promise<ReactedCommitterMap | undefined> {
  const signed = committerMap?.notSigned && committerMap.notSigned.length === 0

  try {
    const claBotComment = await getComment()
    if (!claBotComment && !signed) {
      await createComment(!!signed, committerMap)
      return undefined
    }
    if (claBotComment?.id) {
      if (signed) await updateComment(true, committerMap, claBotComment)

      const reacted = await signatureWithPRComment(committerMap, committers)
      if (reacted?.onlyCommitters) {
        reacted.allSignedFlag = prepareAllSignedCommitters(committerMap, reacted.onlyCommitters, committers)
      }
      committerMap = prepareCommitterMap(committerMap, reacted)
      await updateComment(reacted.allSignedFlag, committerMap, claBotComment)
      return reacted
    }
    return undefined
  } catch (error: any) {
    throw new Error(
      `Error occured when creating or editing the comments of the pull request: ${error.message}`
    )
  }
}

async function createComment(signed: boolean, committerMap: CommitterMap): Promise<void> {
  await getDefaultOctokit()
    .rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: context.issue.number,
      body: commentContent(signed, committerMap)
    })
    .catch((e: any) => {
      throw new Error(`Error occured when creating a pull request comment: ${e.message}`)
    })
}

async function updateComment(
  signed: boolean,
  committerMap: CommitterMap,
  claBotComment: any
): Promise<void> {
  await getDefaultOctokit()
    .rest.issues.updateComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      comment_id: claBotComment.id,
      body: commentContent(signed, committerMap)
    })
    .catch((e: any) => {
      throw new Error(`Error occured when updating the pull request comment: ${e.message}`)
    })
}

async function getComment() {
  try {
    const response = await getDefaultOctokit().rest.issues.listComments({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: context.issue.number
    })
    const marker = getUseDcoFlag() === 'true' ? DCO_BOT_MARKER : getUseDcoFlag() === 'false' ? CLA_BOT_MARKER : null
    if (!marker) return undefined
    const re = new RegExp(`.*${marker}.*`, 'm')
    return response.data.find((c: any) => c.body && re.test(c.body))
  } catch (error: any) {
    throw new Error(`Error occured when getting  all the comments of the pull request: ${error.message}`)
  }
}

function prepareCommitterMap(committerMap: CommitterMap, reacted: ReactedCommitterMap): CommitterMap {
  committerMap.signed?.push(...reacted.newSigned)
  committerMap.notSigned = committerMap.notSigned!.filter(
    committer => !reacted.newSigned.some(r => committer.id === r.id)
  )
  return committerMap
}

function prepareAllSignedCommitters(
  committerMap: CommitterMap,
  signedInPrCommitters: CommittersDetails[],
  committers: CommittersDetails[]
): boolean {
  const ids = new Set(signedInPrCommitters.map(c => c.id))
  const allSigned = [
    ...signedInPrCommitters,
    ...committerMap.signed!.filter(s => !ids.has(s.id))
  ]
  return committers.every(c => allSigned.some(r => c.id === r.id))
}
