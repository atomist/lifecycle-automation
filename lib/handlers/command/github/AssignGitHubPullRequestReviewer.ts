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
    Parameter,
    Secret,
    Secrets,
    Success,
    Tags,
} from "@atomist/automation-client";
import { failure } from "@atomist/automation-client/HandlerResult";
import {
    getChatIds,
    loadGitHubIdByChatId,
} from "../../../util/helpers";
import {
    error,
    warning,
} from "../../../util/messages";
import * as github from "./gitHubApi";

/**
 * Approve GitHub status on commit.
 */
@ConfigurableCommandHandler("Assign GitHub pull request reviewer", {
    intent: ["assign reviewer", "assign github reviewer"],
    autoSubmit: true,
})
@Tags("github", "review")
export class AssignGitHubPullRequestReviewer implements HandleCommand {

    @MappedParameter(MappedParameters.GitHubRepository)
    public repo: string;

    @MappedParameter(MappedParameters.GitHubOwner)
    public owner: string;

    @MappedParameter(MappedParameters.SlackTeam, false)
    public teamId: string;

    @Parameter({
        displayName: "Pull Request Number",
        description: "the number of the pull request number to merge, with no leading `#`",
        pattern: /^.*$/,
        validInput: "an open GitHub pull request number",
        minLength: 1,
        maxLength: 10,
        required: true,
    })
    public issue: number;

    @Parameter({
        displayName: "User name(s) of reviewer",
        description: "the name(s) of reviewer to be assigned to Pull Request. Can be a Slack @-mention",
        pattern: /^.*$/,
        minLength: 2,
        validInput: "an valid GitHub or Slack user name",
        required: true,
    })
    public reviewer: string;

    @MappedParameter(MappedParameters.GitHubApiUrl)
    public apiUrl: string;

    @Secret(Secrets.userToken("repo"))
    public githubToken: string;

    public handle(ctx: HandlerContext): Promise<HandlerResult> {

        // Clean up the reviewer parameter
        const reviewers = this.reviewer.split(" ").map(r => {
            r = r.trim();
            const gitHubId = getChatIds(r);
            if (gitHubId && gitHubId.length === 1) {
                r = gitHubId[0];
            }
            return r;
        });

        return Promise.all(reviewers.map(r => {
                return loadGitHubIdByChatId(r, this.teamId, ctx)
                    .then(chatId => {
                        if (chatId) {
                            return chatId;
                        } else {
                            return r;
                        }
                    });
                }))
                .then(chatIds => {
                    return github.api(this.githubToken, this.apiUrl).pullRequests.createReviewRequest({
                        owner: this.owner,
                        repo: this.repo,
                        number: this.issue,
                        reviewers: chatIds.filter(c => c != null),
                    });
                })
                .then(() => Success)
                .catch(err => {
                    if (err.message) {
                        const body = JSON.parse(err.message);
                        if (body.message.indexOf("Review cannot be requested from pull request author.") >= 0) {
                            return ctx.messageClient
                                .respond(warning("Review Pull Request",
                                    "Review cannot be requested from pull request author.", ctx))
                                .then(() => Success, failure);
                        } else if (body.message.indexOf("Reviews may only be requested from collaborators") >= 0) {
                            return ctx.messageClient
                                .respond(warning("Review Pull Request",
                                    "Reviews may only be requested from collaborators.", ctx))
                                .then(() => Success, failure);
                        } else {
                            return ctx.messageClient.respond(error("Review Pull Request", body.message, ctx))
                                .then(() => Success, failure);
                        }
                    }
                    return failure(err);
                });
    }
}
