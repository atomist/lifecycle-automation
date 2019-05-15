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
    failure,
    MappedParameters,
    Secrets,
    Success,
} from "@atomist/automation-client";
import {
    CommandHandlerRegistration,
    DeclarationType,
} from "@atomist/sdm";
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
 * Assign GitHub pull request reviewer.
 */
export const AssignGitHubPullRequestReviewer: CommandHandlerRegistration<{ repo: string, owner: string, apiUrl: string, teamId: string, issue: number, reviewer: string, githubToken: string }> = {
    name: "AssignGitHubPullRequestReviewer",
    description: "Assign GitHub pull request reviewer",
    tags: ["github", "review"],
    intent: ["assign reviewer", "assign github reviewer"],
    autoSubmit: true,
    parameters: {
        repo: { uri: MappedParameters.GitHubRepository, declarationType: DeclarationType.Mapped },
        owner: { uri: MappedParameters.GitHubOwner, declarationType: DeclarationType.Mapped },
        apiUrl: { uri: MappedParameters.GitHubApiUrl, declarationType: DeclarationType.Mapped },
        githubToken: { uri: Secrets.userToken("repo"), declarationType: DeclarationType.Secret },
        teamId: { uri: MappedParameters.SlackTeam, declarationType: DeclarationType.Mapped },
        issue: {
            displayName: "Pull Request Number",
            description: "the number of the pull request number to merge, with no leading `#`",
            pattern: /^.*$/,
            validInput: "an open GitHub pull request number",
            minLength: 1,
            maxLength: 10,
            required: true,
        },

        reviewer: {
            displayName: "User name(s) of reviewer",
            description: "the name(s) of reviewer to be assigned to Pull Request. Can be a Slack @-mention",
            pattern: /^.*$/,
            minLength: 2,
            validInput: "a valid GitHub or Slack user name",
            required: true,
        },
    },
    listener: async ci => {

        // Clean up the reviewer parameter
        const reviewers = ci.parameters.reviewer.split(" ").map(r => {
            r = r.trim();
            const gitHubId = getChatIds(r);
            if (gitHubId && gitHubId.length === 1) {
                r = gitHubId[0];
            }
            return r;
        });

        return Promise.all(reviewers.map(r => {
            return loadGitHubIdByChatId(r, ci.parameters.teamId, ci.context)
                .then(chatId => {
                    if (chatId) {
                        return chatId;
                    } else {
                        return r;
                    }
                });
        }))
            .then(chatIds => {
                return github.api(ci.parameters.githubToken, ci.parameters.apiUrl).pullRequests.createReviewRequest({
                    owner: ci.parameters.owner,
                    repo: ci.parameters.repo,
                    number: ci.parameters.issue,
                    reviewers: chatIds.filter(c => c != undefined),
                });
            })
            .then(() => Success)
            .catch(err => {
                if (err.message) {
                    const body = JSON.parse(err.message);
                    if (body.message.indexOf("Review cannot be requested from pull request author.") >= 0) {
                        return ci.context.messageClient
                            .respond(warning("Review Pull Request",
                                "Review cannot be requested from pull request author.", ci.context))
                            .then(() => Success, failure);
                    } else if (body.message.indexOf("Reviews may only be requested from collaborators") >= 0) {
                        return ci.context.messageClient
                            .respond(warning("Review Pull Request",
                                "Reviews may only be requested from collaborators.", ci.context))
                            .then(() => Success, failure);
                    } else {
                        return ci.context.messageClient.respond(error("Review Pull Request", body.message, ci.context))
                            .then(() => Success, failure);
                    }
                }
                return failure(err);
            });
    },
};
