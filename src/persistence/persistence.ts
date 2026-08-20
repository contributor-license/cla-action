import { context } from '@actions/github'
import { ClaFileContent, ReactedCommitterMap } from '../interfaces'
import { getDefaultOctokit, getPATOctokit } from '../octokit'
import * as input from '../shared/getInputs'

const DEFAULT_CREATE_MESSAGE = 'Creating file for storing CLA Signatures'

function octokit() {
  return input.isRemoteStorageConfigured() ? getPATOctokit() : getDefaultOctokit()
}

function target() {
  return {
    owner: input.getRemoteOrgName() || context.repo.owner,
    repo: input.getRemoteRepoName() || context.repo.repo,
    path: input.getPathToSignatures(),
    branch: input.getBranch()
  }
}

/** Upstream serialisation: 2-space indent, whole object preserved. */
export function serialise(content: ClaFileContent): string {
  return JSON.stringify(content, null, 2)
}

const encode = (s: string): string => Buffer.from(s).toString('base64')

export async function getFileContent() {
  const { owner, repo, path, branch } = target()
  return octokit().rest.repos.getContent({ owner, repo, path, ref: branch })
}

export async function createFile(content: ClaFileContent) {
  const { owner, repo, path, branch } = target()
  return octokit().rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    branch,
    message: input.getCreateFileCommitMessage() || DEFAULT_CREATE_MESSAGE,
    content: encode(serialise(content))
  })
}

export function signedCommitMessage(pullRequestNo: number, owner: string, repo: string): string {
  const custom = input.getSignedCommitMessage()
  if (!custom) {
    return `@${context.actor} has signed the CLA in ${owner}/${repo}#${pullRequestNo}`
  }
  return custom
    .replace('$contributorName', context.actor)
    .replace('$pullRequestNo', pullRequestNo.toString())
    .replace('$owner', owner)
    .replace('$repo', repo)
}

export async function updateFile(
  sha: string,
  claFileContent: ClaFileContent,
  reactedCommitters: ReactedCommitterMap
) {
  const { owner, repo, path, branch } = target()
  const pullRequestNo = context.issue.number

  // Append only. Never sort, never rewrite existing entries.
  claFileContent.signedContributors.push(...reactedCommitters.newSigned)

  return octokit().rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    branch,
    sha,
    message: signedCommitMessage(pullRequestNo, context.issue.owner, context.issue.repo),
    content: encode(serialise(claFileContent))
  })
}
