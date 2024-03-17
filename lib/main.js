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
const config_1 = require("@/config");
const Lottery_1 = require("@/Lottery");
const core = __importStar(require("@actions/core"));
const rest_1 = require("@octokit/rest");
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (!process.env.GITHUB_REF) {
                throw new Error('missing GITHUB_REF');
            }
            if (!process.env.GITHUB_REPOSITORY) {
                throw new Error('missing GITHUB_REPOSITORY');
            }
            //comes from {{secrets.GITHUB_TOKEN}}
            const token = core.getInput('repo-token', { required: true });
            const config = (0, config_1.getConfig)();
            yield (0, Lottery_1.runLottery)({
                octokit: new rest_1.Octokit({ auth: token }),
                config,
            });
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
run();
