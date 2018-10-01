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
    failure,
    HandleCommand,
    HandlerContext,
    HandlerResult,
    MappedParameter,
    MappedParameters,
    Parameter,
    Secret,
    Secrets,
    Success,
    Tags,
} from "@atomist/automation-client";
import { AutoMergeLabel } from "../../event/pullrequest/autoMerge";
import * as github from "./gitHubApi";

/**
 * Enable Pull Request auto merge.
 */
@ConfigurableCommandHandler("Enable Pull Request auto merge", {
    intent: ["auto merge pr", "auto merge github pr"],
    autoSubmit: true,
})
@Tags("github", "pr", "auto-merge")
export class EnableGitHubPullRequestAutoMerge implements HandleCommand {

    @MappedParameter(MappedParameters.GitHubRepository)
    public repo: string;

    @MappedParameter(MappedParameters.GitHubOwner)
    public owner: string;

    @Parameter({
        displayName: "Pull Request Number",
        description: "number of the pull request number to merge, with no leading `#`",
        pattern: /^.*$/,
        validInput: "an open GitHub pull request number",
        minLength: 1,
        maxLength: 10,
        required: true,
    })
    public issue: number;

    @MappedParameter(MappedParameters.GitHubApiUrl)
    public apiUrl: string;

    @Secret(Secrets.userToken("repo"))
    public githubToken: string;

    public handle(ctx: HandlerContext): Promise<HandlerResult> {
        const api = github.api(this.githubToken, this.apiUrl);

        // Verify that auto-merge label exists
        return api.issues.getLabel({
            name: AutoMergeLabel,
            repo: this.repo,
            owner: this.owner,
        })
        // Label exists; add it to the PR
        .then(() => {
            return api.issues.addLabels({
                owner: this.owner,
                repo: this.repo,
                number: this.issue,
                labels: [AutoMergeLabel],
            });
        })
        // Label doesn't exist; put create it and add it to the PR
        .catch(() => {
            return api.issues.createLabel({
                owner: this.owner,
                repo: this.repo,
                name: AutoMergeLabel,
                color: "277D7D",
            })
                .then(() => {
                    return api.issues.addLabels({
                        owner: this.owner,
                        repo: this.repo,
                        number: this.issue,
                        labels: [AutoMergeLabel],
                    });
                });
        })
        .then(() => Success, failure);
    }
}
