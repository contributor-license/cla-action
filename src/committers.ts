import * as core from '@actions/core'
import { context } from '@actions/github'
import { CommittersDetails } from './interfaces'
import { getDefaultOctokit } from './octokit'

/** github-actions[bot]. Upstream filters this id out by hard-coded literal. */
const GITHUB_ACTIONS_BOT_ID = 41898282

const QUERY = `query($owner:String!, $name:String!, $number:Int!, $cursor:String!) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $number) {
      commits(first: 100, after: $cursor) {
        totalCount
        edges {
          node { commit {
            author { email name user { id databaseId login } }
            committer { name user { id databaseId login } }
          } }
          cursor
        }
        pageInfo { endCursor hasNextPage }
      }
    }
  }
}`

const extractUser = (commit: any) =>
  commit.author?.user || commit.committer?.user || commit.author || commit.committer

export default async function getCommitters(): Promise<CommittersDetails[]> {
  try {
    const response: any = await getDefaultOctokit().graphql(QUERY, {
      owner: context.repo.owner,
      name: context.repo.repo,
      number: context.issue.number,
      cursor: ''
    })

    const commits = response.repository.pullRequest.commits

    // Upstream requests only the first page and never follows the cursor, so a
    // PR with >100 commits silently drops the remainder. Replicated for
    // drop-in parity; warn so it is at least visible. See SPEC.md section 7.
    if (commits.pageInfo?.hasNextPage) {
      core.warning(
        `Pull request has ${commits.totalCount} commits; only the first 100 are ` +
          `inspected for committers.`
      )
    }

    const committers: CommittersDetails[] = []
    for (const edge of commits.edges) {
      const user = extractUser(edge.node.commit)
      const entry = {
        name: user.login || user.name,
        id: user.databaseId || '',
        pullRequestNo: context.issue.number
      } as unknown as CommittersDetails
      // Upstream de-duplicates on name, not id.
      if (!committers.some(c => c.name === entry.name)) committers.push(entry)
    }

    return committers.filter(c => c.id !== GITHUB_ACTIONS_BOT_ID)
  } catch (e) {
    throw new Error(`graphql call to get the committers details failed: ${e}`)
  }
}
