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
    HandlerContext,
    HandlerResult,
    MappedParameter,
    MappedParameters,
    Secret,
    Secrets,
    Success,
    Tags,
} from "@atomist/automation-client";
import { ConfigurableCommandHandler } from "@atomist/automation-client/lib/decorators";
import { HandleCommand } from "@atomist/automation-client/lib/HandleCommand";
import {
    CommandHandlerRegistration,
    DeclarationType,
} from "@atomist/sdm";
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
export const AddGitHubPullRequestAutoMergeLabels: CommandHandlerRegistration<{ repo: string, owner: string, apiUrl: string, githubToken: string }> = {
    name: "AddGitHubPullRequestAutoMergeLabels",
    description: "Add Pull Request auto merge labels",
    tags: ["github", "pr", "auto-merge"],
    intent: ["add auto merge labels"],
    autoSubmit: true,
    parameters: {
        repo: { uri: MappedParameters.GitHubRepository, declarationType: DeclarationType.Mapped },
        owner: { uri: MappedParameters.GitHubOwner, declarationType: DeclarationType.Mapped },
        apiUrl: { uri: MappedParameters.GitHubApiUrl, declarationType: DeclarationType.Mapped },
        githubToken: { uri: Secrets.userToken("repo"), declarationType: DeclarationType.Secret },
    },
    listener: async ci => {
        await addAutoMergeLabels(ci.parameters.owner, ci.parameters.repo, ci.parameters.githubToken, ci.parameters.apiUrl);

        await ci.context.messageClient.respond(success(
            "Auto Merge",
            `Successfully added auto merge labels to ${bold(`${ci.parameters.owner}/${ci.parameters.repo}`)}`));
        return Success;
    },
};

export async function addAutoMergeLabels(owner: string,
                                         repo: string,
                                         token: string,
                                         apiUrl: string): Promise<HandlerResult> {
    const api = github.api(token, apiUrl);

    await addLabel(AutoMergeLabel, "277D7D", owner, repo, api);
    await addLabel(AutoMergeCheckSuccessLabel, "277D7D", owner, repo, api);

    AutoMergeMethods.forEach(
        async mm =>
            addLabel(`${AutoMergeMethodLabel}${mm}`, "1C334B", owner, repo, api));

    return Success;
}

async function addLabel(name: string,
                        color: string,
                        owner: string,
                        repo: string,
                        api: Github) {
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
