import LotteryNS from '@/LotteryNS'
import * as core from '@actions/core'
import yaml from 'js-yaml'
import fs from 'fs'

const CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
const createKey = (length?: number) =>
  Array.from({ length: length || 6 }).reduce(
    acc => `${acc}${CHARACTERS.charAt(Math.floor(Math.random() * CHARACTERS.length))}`,
    ''
  ) as string

const DEFAULT_WEIGHTS: Required<LotteryNS.Weights> = {
  additions: 1,
  deletions: 1,
  changes: 1,
  files: 10
}

const getWeights = (groupWeights?: LotteryNS.Weights, globalWeights?: LotteryNS.Weights): Required<LotteryNS.Weights> =>
  Object.assign({}, DEFAULT_WEIGHTS, globalWeights, groupWeights)

export const getConfig = (): LotteryNS.Config => {
  const configPath = core.getInput('config', { required: true })

  const env: LotteryNS.Env = {
    repository: process.env.GITHUB_REPOSITORY ?? '',
    ref: process.env.GITHUB_HEAD_REF ?? '',
  }

  try {
    const yamlConfig = yaml.load(
      fs.readFileSync(configPath, 'utf8'),
    ) as LotteryNS.YamlConfig

    const groups = yamlConfig.groups.map((group): LotteryNS.GroupConfig => ({
      ...group,
      id: createKey(),
    }))

    const count = yamlConfig.count ?? 1

    const domains = yamlConfig.domains.map((domain): LotteryNS.DomainConfig => ({
      ...domain,
      id: createKey(),
      weights: getWeights(domain.weights, yamlConfig.weights),
      regex: domain.paths.map((path) => new RegExp(path)),
      isRequired: !!domain.isRequired,
    }))

    const assignments = domains.reduce((acc, cur) => {
      const groupSet = new Set<LotteryNS.Username>()
      cur.groups.forEach((groupName) => {
        const currentGroup = groups.find((group) => group.name === groupName)
        if (currentGroup) {
          currentGroup.usernames.forEach((username) => {
            groupSet.add(username)
          })
        }

      })
      acc.set(cur, Array.from(groupSet))
      return acc
    }, new Map<LotteryNS.DomainConfig, LotteryNS.Username[]>())

    return {
      groups,
      domains,
      env,
      assignments,
      count,
    }

  } catch (error: any) {
    core.setFailed(error.message)
  }

  return {
    groups: [],
    domains: [],
    env,
    assignments: new Map(),
    count: 1,
  }
}
