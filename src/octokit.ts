import * as core from '@actions/core'
import { getOctokit } from '@actions/github'

function token(name: string): string {
  const value = process.env[name]
  if (!value) {
    core.setFailed(`Missing ${name}. Add it to your workflow's env.`)
    throw new Error(`Missing ${name}`)
  }
  return value
}

export const getDefaultOctokit = () => getOctokit(token('GITHUB_TOKEN'))
export const getPATOctokit = () => getOctokit(token('PERSONAL_ACCESS_TOKEN'))
