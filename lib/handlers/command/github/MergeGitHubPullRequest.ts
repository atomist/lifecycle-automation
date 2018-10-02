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
import {
    bold,
    url,
} from "@atomist/slack-messages";
import { warning } from "../../../util/messages";
import * as github from "./gitHubApi";

/**
 * Merge a GitHub Pull Request.
 */
@ConfigurableCommandHandler("Merge a GitHub Pull Request", {
    intent: [ "merge pr", "merge pullrequest",
        "merge github pr", "merge gihub pullrequest" ],
    autoSubmit: true,
})
@Tags("github", "pr")
export class MergeGitHubPullRequest implements HandleCommand {

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

    @Parameter({
        displayName: "Merge Method",
        description: "method to use when merging the pull request",
        pattern: /(?:merge|squash|rebase)$/,
        validInput: "one of 'merge', 'squash', or 'rebase', see " +
        "https://developer.github.com/v3/pulls/#merge-a-pull-request-merge-button",
        minLength: 5,
        maxLength: 6,
        required: false,
    })
    public mergeMethod: "merge" | "squash" | "rebase" = "merge";

    @Parameter({
        displayName: "Commit Title",
        pattern: /^.*$/,
        minLength: 0,
        maxLength: 100,
        required: false,
    })
    public title: string;

    @Parameter({
        displayName: "Commit Message",
        pattern: /[\s\S]*/,
        minLength: 0,
        maxLength: 1000,
        required: false,
    })
    public message: string;

    @Parameter({
        displayName: "SHA",
        pattern: /.*$/,
        required: true,
    })
    public sha: string;

    @MappedParameter(MappedParameters.GitHubRepository)
    public repo: string;

    @MappedParameter(MappedParameters.GitHubOwner)
    public owner: string;

    @MappedParameter(MappedParameters.GitHubApiUrl)
    public apiUrl: string;

    @Secret(Secrets.userToken("repo"))
    public githubToken: string;

    public handle(ctx: HandlerContext): Promise<HandlerResult> {
        const api = github.api(this.githubToken, this.apiUrl);
        return api.pullRequests.get({
                owner: this.owner,
                repo: this.repo,
                number: this.issue,
            })
            .then(result => {
                return result.data;
            })
            .then(pr => {
                if (pr.mergeable === true) {
                    return api.pullRequests.merge({
                        owner: this.owner,
                        repo: this.repo,
                        number: this.issue,
                        commit_title: this.title,
                        commit_message: this.message,
                        sha: this.sha,
                        merge_method: this.mergeMethod,
                    });
                } else {
                    const text = `Pull request ${bold(url(pr.html_url, `#${this.issue} ${pr.title}`))} can not` +
                        ` be merged at this time. Please review the pull request for potential conflicts.`;
                    return ctx.messageClient.respond(warning("Merge Pull Request", text, ctx));
                }
            })
            .catch(err => {
                return github.handleError("Merge Pull Request", err, ctx);
            })
            .then(() => Success, failure);
    }
}
