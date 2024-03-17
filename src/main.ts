import { getConfig } from '@/config'
import { runLottery } from '@/Lottery'
import * as core from '@actions/core'
import { Octokit } from '@octokit/rest'

async function run(): Promise<void> {
  try {
    if (!process.env.GITHUB_REF) {
      throw new Error('missing GITHUB_REF')
    }
    if (!process.env.GITHUB_REPOSITORY) {
      throw new Error('missing GITHUB_REPOSITORY')
    }

    //comes from {{secrets.GITHUB_TOKEN}}
    const token = core.getInput('repo-token', { required: true })
    const config = getConfig()

    await runLottery({
      octokit: new Octokit({ auth: token }),
      config,
    })
  } catch (error: unknown) {
    core.setFailed((error as Error).message)
  }
}

run()
