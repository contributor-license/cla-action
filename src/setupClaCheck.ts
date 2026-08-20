import * as core from '@actions/core'
import { context } from '@actions/github'
import { checkAllowList } from './checkAllowList'
import getCommitters from './committers'
import { ClaFileContent, ClaFileContentAndSha, CommitterMap, CommittersDetails } from './interfaces'
import { createFile, getFileContent, updateFile } from './persistence/persistence'
import prCommentSetup from './pullrequest/pullRequestComment'
import { reRunLastWorkFlowIfRequired } from './pullRerunRunner'

const getInitialCommittersMap = (): CommitterMap => ({ signed: [], notSigned: [], unknown: [] })

export async function setupClaCheck(): Promise<void> {
  let committers = await getCommitters()
  committers = checkAllowList(committers)

  const initial = getInitialCommittersMap()
  const fileAndSha = await getClaFileContentAndSha(committers, initial)
  if (!fileAndSha) return
  const { claFileContent, sha } = fileAndSha

  const committerMap = prepareCommitterMap(committers, claFileContent)

  try {
    const reacted = await prCommentSetup(committerMap, committers)

    if (reacted?.newSigned.length) {
      await updateFile(sha, claFileContent, reacted)
    }
    if (
      reacted?.allSignedFlag ||
      committerMap?.notSigned === undefined ||
      committerMap.notSigned.length === 0
    ) {
      core.info(`All contributors have signed the CLA 📝 ✅ `)
      return reRunLastWorkFlowIfRequired()
    }
    core.setFailed(
      `Committers of Pull Request number ${context.issue.number} have to sign the CLA 📝`
    )
  } catch (err: any) {
    core.setFailed(`Could not update the JSON file: ${err.message}`)
  }
}

function isNotFound(error: any): boolean {
  // Upstream compares `error.status === "404"` against a number, so this branch
  // never fired and a missing signature file surfaced as a hard error instead
  // of being created. Repos migrating from upstream already have the file, so
  // fixing it cannot regress them - it only unbreaks first-time setup.
  return Number(error?.status) === 404
}

async function getClaFileContentAndSha(
  committers: CommittersDetails[],
  committerMap: CommitterMap
): Promise<ClaFileContentAndSha | undefined> {
  let result: any
  try {
    result = await getFileContent()
  } catch (error: any) {
    if (isNotFound(error)) {
      await createClaFileAndPRComment(committers, committerMap)
      return undefined
    }
    throw new Error(
      `Could not retrieve repository contents. Status: ${error?.status || 'unknown'}`
    )
  }

  const sha = result?.data?.sha
  const claFileContent: ClaFileContent = JSON.parse(
    Buffer.from(result.data.content, 'base64').toString()
  )
  return { claFileContent, sha }
}

async function createClaFileAndPRComment(
  committers: CommittersDetails[],
  committerMap: CommitterMap
): Promise<void> {
  committerMap.notSigned = committers
  committerMap.signed = []
  committers.forEach(c => {
    if (!c.id) committerMap.unknown.push(c)
  })

  // Upstream seeded this file at 3-space indent while every later write used 2,
  // so the first signature reformatted the whole file. Seeded at 2 here.
  await createFile({ signedContributors: [] }).catch((error: any) =>
    core.setFailed(
      `Error occurred when creating the signed contributors file: ${
        error.message || error
      }. Make sure the branch where signatures are stored is NOT protected.`
    )
  )
  await prCommentSetup(committerMap, committers)
  throw new Error(`Committers of pull request ${context.issue.number} have to sign the CLA`)
}

function prepareCommitterMap(
  committers: CommittersDetails[],
  claFileContent: ClaFileContent
): CommitterMap {
  const committerMap = getInitialCommittersMap()
  const signedIds = claFileContent?.signedContributors || []

  committerMap.notSigned = committers.filter(c => !signedIds.some(s => c.id === s.id))
  committerMap.signed = committers.filter(c => signedIds.some(s => c.id === s.id))
  committers.forEach(c => {
    if (!c.id) committerMap.unknown.push(c)
  })
  return committerMap
}
