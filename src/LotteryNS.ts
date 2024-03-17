
export type RecursiveRequired<T> = {
  [K in keyof T]-?: T[K] extends (infer U)[]
    ? RecursiveRequired<U>[]
    : T[K] extends object
    ? T[K]
    : Required<T[K]>
}

type WithKey<T> = T & {
  id: string
}

namespace LotteryNS {
  export type PullRequest = import('@octokit/openapi-types').components['schemas']['pull-request-simple']

  export type Env = {
    repository: string
    ref: string
  }

  export type Weights = {
    changes?: number
    deletions?: number
    additions?: number
    files?: number
  }

  export type DomainUsers = {
    common: Username[]
    counts: Map<Username, number>
  }

  export type Username = string

  export type Group = {
    name: string
    usernames: Username[]
  }

  export type GroupConfig = RecursiveRequired<WithKey<Group>>

  export type Domain = {
    paths: string[]
    weights?: Weights
    isRequired?: boolean
    groups: string[]
  }

  export type DomainConfig = RecursiveRequired<WithKey<Domain> & {
    regex: RegExp[]
  }>

  export type YamlConfig = {
    groups: Group[]
    domains: Domain[]
    weights?: Weights
    count?: number
  }

  export type Assignments = Map<DomainConfig, Username[]>

  export type Config = {
    groups: GroupConfig[]
    domains: DomainConfig[]
    env: Env
    assignments: Assignments
    count: number
  }
}

export default LotteryNS
