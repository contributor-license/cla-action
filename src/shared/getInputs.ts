import * as core from '@actions/core'

const str = (name: string): string => core.getInput(name, { required: false })

export const getPathToSignatures = (): string => str('path-to-signatures')
export const getBranch = (): string => str('branch')
export const getAllowListItem = (): string => str('allowlist')
export const getPathToDocument = (): string => str('path-to-document')
export const getRemoteRepoName = (): string => str('remote-repository-name')
export const getRemoteOrgName = (): string => str('remote-organization-name')
export const getSignedCommitMessage = (): string => str('signed-commit-message')
export const getSignedEmptyCommitMessage = (): string => str('signed-empty-commit-message')
export const getCreateFileCommitMessage = (): string => str('create-file-commit-message')
export const getCustomNotSignedPrComment = (): string => str('custom-notsigned-prcomment')
export const getCustomAllSignedPrComment = (): string => str('custom-allsigned-prcomment')
export const getCustomPrSignComment = (): string => str('custom-pr-sign-comment')
// Flags stay strings. getUseDcoFlag is tri-state upstream: 'true' => DCO,
// 'false' => CLA, anything else => no signature ever matches. Coercing to
// boolean would collapse that third branch. See SPEC.md section 2.
export const getEmptyCommitFlag = (): string => str('empty-commit-flag')
export const getUseDcoFlag = (): string => str('use-dco-flag')
export const lockPullRequestAfterMerge = (): string => str('lock-pullrequest-aftermerge')
export const suggestRecheck = (): string => str('suggest-recheck')

export const isRemoteStorageConfigured = (): boolean =>
  Boolean(getRemoteRepoName() || getRemoteOrgName())
