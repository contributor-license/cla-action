import * as core from '@actions/core'
import { context } from '@actions/github'
import { getDefaultOctokit } from '../octokit'

export async function lockPullRequest(): Promise<void> {
  core.info('Locking the Pull Request to safe guard the Pull Request CLA Signatures')
  const pullRequestNo: number = context.issue.number
  try {
    await getDefaultOctokit().rest.issues.lock({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: pullRequestNo
    })
    core.info(`successfully locked the pull request ${pullRequestNo}`)
  } catch {
    core.error(`failed when locking the pull request `)
  }
}
