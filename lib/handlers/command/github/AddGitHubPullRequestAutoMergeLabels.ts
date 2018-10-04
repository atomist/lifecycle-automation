/*
 * Copyright © 2018 Atomist, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
    ConfigurableCommandHandler,
    HandleCommand,
    HandlerContext,
    HandlerResult,
    MappedParameter,
    MappedParameters,
    Secret,
    Secrets,
    Success,
    Tags,
} from "@atomist/automation-client";
import { bold } from "@atomist/slack-messages";
import * as Github from "@octokit/rest";
import { success } from "../../../util/messages";
import {
    AutoMergeCheckSuccessLabel,
    AutoMergeLabel,
    AutoMergeMethodLabel,
    AutoMergeMethods,
} from "../../event/pullrequest/autoMerge";
import * as github from "./gitHubApi";

/**
 * Add Pull Request auto merge labels.
 */
@ConfigurableCommandHandler("Add Pull Request auto merge labels", {
    intent: ["add auto merge labels"],
    autoSubmit: true,
})
@Tags("github", "pr", "auto-merge")
export class AddGitHubPullRequestAutoMergeLabels implements HandleCommand {

    @MappedParameter(MappedParameters.GitHubRepository)
    public repo: string;

    @MappedParameter(MappedParameters.GitHubOwner)
    public owner: string;

    @MappedParameter(MappedParameters.GitHubApiUrl)
    public apiUrl: string;

    @Secret(Secrets.userToken("repo"))
    public githubToken: string;

    public async handle(ctx: HandlerContext): Promise<HandlerResult> {
        await addAutoMergeLabels(ctx);

        await ctx.messageClient.respond(success(
            "Auto Merge",
            `Successfully added auto merge labels to ${bold(`${this.owner}/${this.repo}`)}`));
        return Success;
    }
}

export async function addAutoMergeLabels(ctx: HandlerContext): Promise<HandlerResult> {
    const api = github.api(this.githubToken, this.apiUrl);

    await addLabel(AutoMergeLabel, "277D7D", this.owner, this.repo, api);
    await addLabel(AutoMergeCheckSuccessLabel, "277D7D", this.owner, this.repo, api);

    AutoMergeMethods.forEach(
        async mm =>
            await addLabel(`${AutoMergeMethodLabel}${mm}`, "1C334B", this.owner, this.repo, api));

    return Success;
}

async function addLabel(name: string, color: string, owner: string, repo: string, api: Github) {
    try {
        await api.issues.getLabel({
            name,
            repo,
            owner,
        });
    } catch (err) {
        await api.issues.createLabel({
            owner,
            repo,
            name,
            color,
        });
    }
}
