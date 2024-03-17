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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfig = void 0;
const core = __importStar(require("@actions/core"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const fs_1 = __importDefault(require("fs"));
const CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const createKey = (length) => Array.from({ length: length || 6 }).reduce(acc => `${acc}${CHARACTERS.charAt(Math.floor(Math.random() * CHARACTERS.length))}`, '');
const DEFAULT_WEIGHTS = {
    additions: 1,
    deletions: 1,
    changes: 1,
    file: 10
};
const getWeights = (groupWeights, globalWeights) => Object.assign({}, DEFAULT_WEIGHTS, globalWeights, groupWeights);
const getConfig = () => {
    var _a, _b, _c;
    const configPath = core.getInput('config', { required: true });
    const env = {
        repository: (_a = process.env.GITHUB_REPOSITORY) !== null && _a !== void 0 ? _a : '',
        ref: (_b = process.env.GITHUB_HEAD_REF) !== null && _b !== void 0 ? _b : '',
    };
    try {
        const yamlConfig = js_yaml_1.default.load(fs_1.default.readFileSync(configPath, 'utf8'));
        const groups = yamlConfig.groups.map((group) => (Object.assign(Object.assign({}, group), { id: createKey() })));
        const count = (_c = yamlConfig.count) !== null && _c !== void 0 ? _c : 1;
        const domains = yamlConfig.domains.map((domain) => (Object.assign(Object.assign({}, domain), { id: createKey(), weights: getWeights(domain.weights, yamlConfig.weights), regex: domain.paths.map((path) => new RegExp(path)), isRequired: !!domain.isRequired })));
        const assignments = domains.reduce((acc, cur) => {
            const groupSet = new Set();
            cur.groupNames.forEach((groupName) => {
                const currentGroup = groups.find((group) => group.name === groupName);
                if (currentGroup) {
                    currentGroup.usernames.forEach((username) => {
                        groupSet.add(username);
                    });
                }
            });
            acc.set(cur, Array.from(groupSet));
            return acc;
        }, new Map());
        return {
            groups,
            domains,
            env,
            assignments,
            count,
        };
    }
    catch (error) {
        core.setFailed(error.message);
    }
    return {
        groups: [],
        domains: [],
        env,
        assignments: new Map(),
        count: 1,
    };
};
exports.getConfig = getConfig;
