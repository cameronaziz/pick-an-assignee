import LotteryNS from '@/LotteryNS'
import * as core from '@actions/core'
import { Octokit } from '@octokit/rest'

type LotteryOptions = {
  octokit: Octokit
  config: LotteryNS.Config
}

class Lottery {
  octokit: Octokit
  config: LotteryNS.Config
  pullRequest: LotteryNS.PullRequest | undefined | null

  constructor(options: LotteryOptions) {
    const { octokit, config } = options
    this.octokit = octokit
    this.config = config
    this.pullRequest = undefined
  }

  async pick(): Promise<void> {
    try {
      const ready = await this.isReadyToReview()
      const pullRequest = await this.getPullRequest()
      if (ready && pullRequest) {
        const counts = await this.findDomains(pullRequest)
        const possibleUsers = this.selectPossibleUsers(pullRequest, counts)
        const pickUsers = this.pickUsers(possibleUsers)
        if (pickUsers.length > 0) {
          await this.setAssignee(pickUsers)
        }
      }
    } catch (error: unknown) {
      core.error(error as Error)
      core.setFailed(error as Error)
    }
  }

  async isReadyToReview(): Promise<boolean> {
    try {
      const pr = await this.getPullRequest()
      return !!pr && !pr.draft
    } catch (error: any) {
      core.error(error)
      core.setFailed(error)
      return false
    }
  }

  async setAssignee(logins: (string | undefined)[]) {
    return this.octokit.issues.addAssignees({
      owner: this.owner,
      repo: this.repo,
      issue_number: this.pullRequestNumber,
      assignees: logins.filter(
        (login): login is string => typeof login === 'string',
      ),
    })
  }

  pickUsers(possibleUsers: LotteryNS.Username[]) {
    if (possibleUsers.length <= this.config.count) {
      return possibleUsers
    }
    const remainingUsers = possibleUsers.reduce((acc, cur) => {
      acc.push(cur)
      return acc
    }, [] as LotteryNS.Username[])
    const picks: LotteryNS.Username[] = []
    while (picks.length < this.config.count) {
      const index =  Math.floor(Math.random() * remainingUsers.length)
      picks.push(remainingUsers[index])
      remainingUsers.splice(index, 1)
    }

    return picks
  }

  async findDomains(pullRequest: LotteryNS.PullRequest) {
    const compare = await this.octokit.repos.compareCommitsWithBasehead({
      repo: this.repo,
      owner: this.owner,
      basehead: `${pullRequest.base.ref}...${pullRequest.head.ref}`
    })

    return compare.data.files?.reduce((acc, cur) => {
      const { filename, changes, additions, deletions } = cur
      this.config.domains
        .filter((domain) =>
          domain.regex.some((regex) =>
            regex.test(filename)
          )
        ).forEach((domain) => {
          const increase =
            (additions * domain.weights.additions) +
            (deletions * domain.weights.deletions) +
            (changes * domain.weights.changes) +
            domain.weights.files

          acc.set(domain, (acc.get(domain) ?? 0) + increase)
        })
      return acc
    }, new Map<LotteryNS.DomainConfig, number>()) ?? new Map<LotteryNS.DomainConfig, number>()

  }

  selectPossibleUsers(pullRequest: LotteryNS.PullRequest, domainCounts: Map<LotteryNS.DomainConfig, number>): string[] {
    const author = pullRequest.user?.login

    if (!author) {
      return []
    }

    const { common: userCommon, counts: userCounts  } = Array.from(domainCounts)
      .reduce((acc, [domain, count], index) => {
        const usernames = this.config.assignments.get(domain)
        if (!usernames) {
          return acc
        }

        const users = usernames.filter((username) => username !== author)

        users.forEach((username) => {
          acc.counts.set(username, (acc.counts.get(username) ?? 0) + count)
        })

        if (index === 0) {
          acc.common.concat(users)
          return acc
        }

        acc.common = acc.common.filter((username) => users.includes(username))
        return acc
      }, { common: [], counts: new Map() } as LotteryNS.DomainUsers )

    if (userCommon.length > 0) {
      return userCommon
    }

    return Array
      .from(userCounts)
      .sort(([, aCount], [, bCount]) => bCount - aCount)
      .slice(0, 5)
      .map(([userCount]) => userCount)

    //
    // try {
    //   for (const {
    //     reviewers,
    //     internal_reviewers: internalReviewers,
    //     usernames,
    //   } of this.config.groups) {
    //     const reviewersToRequest =
    //       usernames.includes(author) && internalReviewers
    //         ? internalReviewers
    //         : reviewers
    //
    //     if (reviewersToRequest) {
    //       selected = selected.concat(
    //         this.pickRandom(
    //           usernames,
    //           reviewersToRequest,
    //           selected.concat(author),
    //         ),
    //       )
    //     }
    //   }
    // } catch (error: any) {
    //   core.error(error)
    //   core.setFailed(error)
    // }
    //
    // return selected
  }

  pickRandom(items: string[], n: number, ignore: string[]): string[] {
    const picks: string[] = []

    const candidates = items.filter((item) => !ignore.includes(item))

    while (picks.length < n) {
      const random = Math.floor(Math.random() * candidates.length)
      const pick = candidates.splice(random, 1)[0]

      if (!picks.includes(pick)) {
        picks.push(pick)
      }
    }

    return picks
  }

  get owner() {
    return this.config.env.repository.split('/')[0]
  }

  get repo() {
    return this.config.env.repository.split('/')[1]
  }

  get pullRequestNumber() {
    return Number(this.pullRequest?.number)
  }

  async getPullRequest(): Promise<LotteryNS.PullRequest | null> {
    if (this.pullRequest) {
      return this.pullRequest
    }

    try {
      const response = await this.octokit.pulls.list({
        owner: this.owner,
        repo: this.repo,
      })

      this.pullRequest = response.data.find(
        (pull) => pull.head.ref === this.config.env.ref,
      )

      if (!this.pullRequest) {
        throw new Error(`PR matching ref not found: ${this.config.env.ref}`)
      }

      return this.pullRequest
    } catch (error: any) {
      core.error(error)
      core.setFailed(error)

      return null
    }
  }
}

type RunLotteryOptions = {
  octokit: Octokit
  config: LotteryNS.Config
}

type RunLottery = (options: RunLotteryOptions) => Promise<void>

export const runLottery: RunLottery = async (options) => {
  const { octokit, config } = options
  const lottery = new Lottery({ octokit, config })

  await lottery.pick()
}
