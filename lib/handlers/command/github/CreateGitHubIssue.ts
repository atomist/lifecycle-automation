/*
 * Copyright © 2019 Atomist, Inc.
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
    Parameter,
    Secret,
    Secrets,
    Success,
    Tags,
} from "@atomist/automation-client";
import { CommandHandler } from "@atomist/automation-client/lib/decorators";
import { HandleCommand } from "@atomist/automation-client/lib/HandleCommand";
import * as _ from "lodash";
import { DefaultGitHubLifecycleOptions } from "../../../machine/githubLifecycleSupport";
import * as graphql from "../../../typings/types";
import { replaceChatIdWithGitHubId } from "../../../util/helpers";
import { issueToIssueLifecycle } from "../../event/issue/IssueToIssueLifecycle";
import * as github from "./gitHubApi";

@CommandHandler("Create an issue on GitHub", "create issue", "create github issue")
@Tags("github", "issue")
export class CreateGitHubIssue implements HandleCommand {

    @Parameter({
        displayName: "Issue Title",
        description: "title of issue",
        pattern: /^.*$/,
        validInput: "a single line of text",
        minLength: 1,
        maxLength: 120,
        required: true,
    })
    public title: string;

    @Parameter({
        displayName: "Issue Body",
        description: "descriptive text for issue",
        pattern: /[\s\S]*/,
        validInput: "free text, up to 1000 characters",
        minLength: 0,
        maxLength: 1000,
        required: false,
    })
    public body: string = "";

    @MappedParameter(MappedParameters.GitHubRepository)
    public repo: string;

    @MappedParameter(MappedParameters.GitHubOwner)
    public owner: string;

    @MappedParameter(MappedParameters.GitHubRepositoryProvider)
    public providerId: string;

    @MappedParameter(MappedParameters.GitHubApiUrl)
    public apiUrl: string;

    @MappedParameter(MappedParameters.SlackChannelName, false)
    public channelName: string;

    @MappedParameter(MappedParameters.SlackTeam, false)
    public teamId: string;

    @Secret(Secrets.userToken("repo"))
    public githubToken: string;

    public handle(ctx: HandlerContext): Promise<HandlerResult> {

        return replaceChatIdWithGitHubId(this.body, this.teamId, ctx)
            .then(body => {
                return trimQuotes(body);
            })
            .then(body => {
                return github.api(this.githubToken, this.apiUrl).issues.create({
                    owner: this.owner,
                    repo: this.repo,
                    title: this.title,
                    body,
                });
            })
            .then(result => {
                if (this.channelName && this.teamId) {
                    // run a graphql query to check whether the current channel is mapped
                    // to the repo we are creating the issue in.
                    return ctx.graphClient.query<graphql.ChatChannel.Query,
                        graphql.ChatChannel.Variables>({
                        name: "chatChannel",
                        variables: {
                            teamId: this.teamId,
                            channelName: this.channelName,
                            repoOwner: this.owner,
                            repoName: this.repo,
                        },
                    })
                        .then(repoChannelMapping => {
                            const repo = _.get(repoChannelMapping, "ChatTeam[0].channels[0].repos[0]");
                            if (!(repo && repo.name === this.repo && repo.owner === this.owner)) {
                                return result;
                            } else {
                                return null;
                            }
                        });
                } else {
                    return null;
                }
            })
            .then(result => {
                return ctx.graphClient.query<graphql.ProviderTypeFromRepo.Query,
                    graphql.ProviderTypeFromRepo.Variables>({
                    name: "providerTypeFromRepo",
                    variables: {
                        owner: this.owner,
                        name: this.repo,
                        providerId: this.providerId,
                    },
                })
                    .then(providerResult => {
                        return { issue: result, provider: _.get(providerResult, "Repo[0].org.provider") };
                    });
            })
            .then(result => {
                // if the originating channel isn't mapped to the repo, we render the issue right here
                // by re-using all the rendering logic from lifecycle.
                if (result && result.issue && result.issue.data && result.provider) {
                    const gi = result.issue.data;
                    const issue: graphql.IssueToIssueLifecycle.Issue = {
                        number: gi.number,
                        body: gi.body,
                        title: gi.title,
                        state: gi.state,
                        labels: gi.labels ? gi.labels.map(l => ({ name: l.name })) : [],
                        repo: {
                            owner: this.owner,
                            name: this.repo,
                            channels: [{
                                name: this.channelName,
                                team: {
                                    id: this.teamId,
                                },
                            }],
                            org: {
                                provider: result.provider,
                            },
                        },
                        createdAt: gi.created_at,
                        updatedAt: gi.updated_at,
                        openedBy: {
                            login: gi.user.login,
                        },
                    };

                    const handler = issueToIssueLifecycle(DefaultGitHubLifecycleOptions.issue.chat).listener;
                    return handler(
                        {
                            data: { Issue: [issue] as any },
                            extensions: { operationName: "CreateGitHubIssue" },
                        }, ctx, { orgToken: this.githubToken });
                } else {
                    return Success;
                }
            });
    }
}

function trimQuotes(original: string): string {
    return original.replace(
        /^"(.*)"$/, "$1").replace(
        /^'(.*)'$/, "$1");
}
