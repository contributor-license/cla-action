import * as core from '@actions/core'
import { context } from '@actions/github'
import { lockPullRequest } from './pullrequest/pullRequestLock'
import * as input from './shared/getInputs'
import { setupClaCheck } from './setupClaCheck'

export async function run(): Promise<void> {
  try {
    core.info(`Contributor License GitHub Action has started the process`)

    if (context.payload.action === 'closed' && input.lockPullRequestAfterMerge() == 'true') {
      return await lockPullRequest()
    }
    await setupClaCheck()
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
