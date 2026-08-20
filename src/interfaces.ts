/** Signature record. Wire-compatible with the upstream `CommittersDetails`. */
export interface CommittersDetails {
  name: string
  id: number
  pullRequestNo?: number
  created_at?: string
  updated_at?: string
  comment_id?: number
  body?: string
  repoId?: number
}

/** Parsed signature file. Unknown sibling keys round-trip untouched. */
export interface ClaFileContent {
  signedContributors: CommittersDetails[]
  [key: string]: unknown
}

export interface CommitterMap {
  signed: CommittersDetails[]
  notSigned: CommittersDetails[]
  unknown: CommittersDetails[]
}

export interface ReactedCommitterMap {
  newSigned: CommittersDetails[]
  onlyCommitters?: CommittersDetails[]
  allSignedFlag: boolean
}

export interface ClaFileContentAndSha {
  claFileContent: ClaFileContent
  sha: string
}
