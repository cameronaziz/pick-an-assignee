"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runLottery = void 0;
const core = __importStar(require("@actions/core"));
class Lottery {
    constructor(options) {
        const { octokit, config } = options;
        this.octokit = octokit;
        this.config = config;
        this.pullRequest = undefined;
    }
    pick() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const ready = yield this.isReadyToReview();
                const pullRequest = yield this.getPullRequest();
                if (ready && pullRequest) {
                    const counts = yield this.findDomains(pullRequest);
                    const possibleUsers = this.selectPossibleUsers(pullRequest, counts);
                    const pickUsers = this.pickUsers(possibleUsers);
                    if (pickUsers.length > 0) {
                        yield this.setAssignee(pickUsers);
                    }
                }
            }
            catch (error) {
                core.error(error);
                core.setFailed(error);
            }
        });
    }
    isReadyToReview() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const pr = yield this.getPullRequest();
                return !!pr && !pr.draft;
            }
            catch (error) {
                core.error(error);
                core.setFailed(error);
                return false;
            }
        });
    }
    setAssignee(logins) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.octokit.issues.addAssignees({
                owner: this.owner,
                repo: this.repo,
                issue_number: this.pullRequestNumber,
                assignees: logins.filter((login) => typeof login === 'string'),
            });
        });
    }
    pickUsers(possibleUsers) {
        if (possibleUsers.length <= this.config.count) {
            return possibleUsers;
        }
        const remainingUsers = possibleUsers.reduce((acc, cur) => {
            acc.push(cur);
            return acc;
        }, []);
        const picks = [];
        while (picks.length < this.config.count) {
            const index = Math.floor(Math.random() * remainingUsers.length);
            picks.push(remainingUsers[index]);
            remainingUsers.splice(index, 1);
        }
        return picks;
    }
    findDomains(pullRequest) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const compare = yield this.octokit.repos.compareCommitsWithBasehead({
                repo: this.repo,
                owner: this.owner,
                basehead: `${pullRequest.base.ref}...${pullRequest.head.ref}`
            });
            return (_b = (_a = compare.data.files) === null || _a === void 0 ? void 0 : _a.reduce((acc, cur) => {
                const { filename, changes, additions, deletions } = cur;
                this.config.domains
                    .filter((domain) => domain.regex.some((regex) => regex.test(filename))).forEach((domain) => {
                    var _a;
                    const increase = (additions * domain.weights.additions) +
                        (deletions * domain.weights.deletions) +
                        (changes * domain.weights.changes) +
                        domain.weights.file;
                    acc.set(domain, ((_a = acc.get(domain)) !== null && _a !== void 0 ? _a : 0) + increase);
                });
                return acc;
            }, new Map())) !== null && _b !== void 0 ? _b : new Map();
        });
    }
    selectPossibleUsers(pullRequest, domainCounts) {
        var _a;
        const author = (_a = pullRequest.user) === null || _a === void 0 ? void 0 : _a.login;
        if (!author) {
            return [];
        }
        const { common: userCommon, counts: userCounts } = Array.from(domainCounts)
            .reduce((acc, [domain, count], index) => {
            const usernames = this.config.assignments.get(domain);
            if (!usernames) {
                return acc;
            }
            const users = usernames.filter((username) => username !== author);
            users.forEach((username) => {
                var _a;
                acc.counts.set(username, ((_a = acc.counts.get(username)) !== null && _a !== void 0 ? _a : 0) + count);
            });
            if (index === 0) {
                acc.common.concat(users);
                return acc;
            }
            acc.common = acc.common.filter((username) => users.includes(username));
            return acc;
        }, { common: [], counts: new Map() });
        if (userCommon.length > 0) {
            return userCommon;
        }
        return Array
            .from(userCounts)
            .sort(([, aCount], [, bCount]) => bCount - aCount)
            .slice(0, 5)
            .map(([userCount]) => userCount);
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
    pickRandom(items, n, ignore) {
        const picks = [];
        const candidates = items.filter((item) => !ignore.includes(item));
        while (picks.length < n) {
            const random = Math.floor(Math.random() * candidates.length);
            const pick = candidates.splice(random, 1)[0];
            if (!picks.includes(pick)) {
                picks.push(pick);
            }
        }
        return picks;
    }
    get owner() {
        return this.config.env.repository.split('/')[0];
    }
    get repo() {
        return this.config.env.repository.split('/')[1];
    }
    get pullRequestNumber() {
        var _a;
        return Number((_a = this.pullRequest) === null || _a === void 0 ? void 0 : _a.number);
    }
    getPullRequest() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.pullRequest) {
                return this.pullRequest;
            }
            try {
                const response = yield this.octokit.pulls.list({
                    owner: this.owner,
                    repo: this.repo,
                });
                this.pullRequest = response.data.find((pull) => pull.head.ref === this.config.env.ref);
                if (!this.pullRequest) {
                    throw new Error(`PR matching ref not found: ${this.config.env.ref}`);
                }
                return this.pullRequest;
            }
            catch (error) {
                core.error(error);
                core.setFailed(error);
                return null;
            }
        });
    }
}
const runLottery = (options) => __awaiter(void 0, void 0, void 0, function* () {
    const { octokit, config } = options;
    const lottery = new Lottery({ octokit, config });
    yield lottery.pick();
});
exports.runLottery = runLottery;
