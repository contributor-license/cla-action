import * as core from '@actions/core'
import { context } from '@actions/github'
import { getDefaultOctokit } from './octokit'

// Why the last failed run is re-triggered:
// https://github.com/cla-assistant/github-action/issues/39
export async function reRunLastWorkFlowIfRequired(): Promise<void> {
  if (context.eventName === 'pull_request') {
    core.debug(`rerun not required for event - pull_request`)
    return
  }

  const branch = await getBranchOfPullRequest()
  const workflowId = await getSelfWorkflowId()
  const runs = await listWorkflowRunsInBranch(branch, workflowId)

  if (runs.data.total_count > 0) {
    const run = runs.data.workflow_runs[0].id
    if (await checkIfLastWorkFlowFailed(run)) {
      core.debug(`Rerunning build run ${run}`)
      await reRunWorkflow(run).catch(error =>
        core.error(`Error occurred when re-running the workflow: ${error}`)
      )
    }
  }
}

async function getBranchOfPullRequest(): Promise<string> {
  const pullRequest = await getDefaultOctokit().rest.pulls.get({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: context.issue.number
  })
  return pullRequest.data.head.ref
}

async function getSelfWorkflowId(): Promise<number> {
  const perPage = 30
  let hasNextPage = true

  for (let page = 1; hasNextPage; page++) {
    const list = await getDefaultOctokit().rest.actions.listRepoWorkflows({
      owner: context.repo.owner,
      repo: context.repo.repo,
      per_page: perPage,
      page
    })
    if (list.data.total_count < page * perPage) hasNextPage = false

    const workflow = list.data.workflows.find(w => w.name == context.workflow)
    if (workflow) return workflow.id
  }

  throw new Error(`Unable to locate this workflow's ID in this repository, can't trigger job..`)
}

async function listWorkflowRunsInBranch(branch: string, workflowId: number): Promise<any> {
  return getDefaultOctokit().rest.actions.listWorkflowRuns({
    owner: context.repo.owner,
    repo: context.repo.repo,
    branch,
    workflow_id: workflowId,
    event: 'pull_request_target'
  })
}

// Requires a PAT with repo scope; GITHUB_TOKEN cannot re-run a workflow.
async function reRunWorkflow(run: number): Promise<any> {
  return getDefaultOctokit().rest.actions.reRunWorkflow({
    owner: context.repo.owner,
    repo: context.repo.repo,
    run_id: run
  })
}

async function checkIfLastWorkFlowFailed(run: number): Promise<boolean> {
  const response = await getDefaultOctokit().rest.actions.getWorkflowRun({
    owner: context.repo.owner,
    repo: context.repo.repo,
    run_id: run
  })
  return response.data.conclusion == 'failure'
}
