import * as core from '@actions/core'

const str = (name: string): string => core.getInput(name, { required: false })
const bool = (name: string): boolean => str(name).toLowerCase() === 'true'

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
export const getEmptyCommitFlag = (): boolean => bool('empty-commit-flag')
export const getUseDcoFlag = (): boolean => bool('use-dco-flag')
export const lockPullRequestAfterMerge = (): boolean => bool('lock-pullrequest-aftermerge')
export const suggestRecheck = (): boolean => bool('suggest-recheck')

export const isRemoteStorageConfigured = (): boolean =>
  Boolean(getRemoteRepoName() || getRemoteOrgName())
