import { context } from '@actions/github'
import { CommitterMap, CommittersDetails, ReactedCommitterMap } from '../interfaces'
import { getDefaultOctokit } from '../octokit'
import { getCustomPrSignComment, getUseDcoFlag } from '../shared/getInputs'

const CLA_RE = /^.*i \s*have \s*read \s*the \s*cla \s*document \s*and \s*i \s*hereby \s*sign \s*the \s*cla.*$/
const DCO_RE = /^.*i \s*have \s*read \s*the \s*dco \s*document \s*and \s*i \s*hereby \s*sign \s*the \s*dco.*$/

export function isCommentSignedByUser(comment: string, commentAuthor: string): boolean {
  if (commentAuthor === 'github-actions[bot]') return false

  if (getCustomPrSignComment() !== '') {
    return getCustomPrSignComment().toLowerCase() === comment
  }
  // Tri-state on purpose: anything other than 'true'/'false' matches nothing.
  switch (getUseDcoFlag()) {
    case 'true':
      return DCO_RE.test(comment)
    case 'false':
      return CLA_RE.test(comment)
    default:
      return false
  }
}

export default async function signatureWithPRComment(
  committerMap: CommitterMap,
  committers: CommittersDetails[]
): Promise<ReactedCommitterMap> {
  const repoId = context.payload.repository!.id

  const prResponse = await getDefaultOctokit().rest.issues.listComments({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: context.issue.number
  })

  const listOfPRComments: CommittersDetails[] = (prResponse?.data || []).map((c: any) => ({
    name: c.user.login,
    id: c.user.id,
    comment_id: c.id,
    body: (c.body || '').trim().toLowerCase(),
    created_at: c.created_at,
    repoId: repoId,
    pullRequestNo: context.issue.number
  }))

  const filtered = listOfPRComments.filter(c => isCommentSignedByUser(c.body || '', c.name))
  filtered.forEach(c => delete c.body)

  const newSigned = filtered.filter(commented =>
    committerMap.notSigned!.some(notSigned => commented.id === notSigned.id)
  )
  const onlyCommitters = committers.filter(committer =>
    filtered.some(commented => committer.id == commented.id)
  )

  return { newSigned, onlyCommitters, allSignedFlag: false }
}
