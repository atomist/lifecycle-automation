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
import { ConfigurableCommandHandler } from "@atomist/automation-client/lib/decorators";
import { HandleCommand } from "@atomist/automation-client/lib/HandleCommand";
import {
    Action,
    Attachment,
    escape,
    SlackMessage,
    url,
} from "@atomist/slack-messages";
import * as formatDate from "format-date";
import * as _ from "lodash";
import * as graphql from "../../../typings/types";
import * as github from "./gitHubApi";

@ConfigurableCommandHandler("List user's GitHub issues from mapped repositories", {
    intent: [ "my issues", "my github issues" ],
    autoSubmit: true,
})
@Tags("github", "issue")
export class ListMyGitHubIssues implements HandleCommand {

    @Parameter({ description: "number of days to search", pattern: /^[0-9]*/, required: false })
    public days: number = 1;

    @MappedParameter(MappedParameters.GitHubApiUrl)
    public apiUrl: string;

    @MappedParameter(MappedParameters.SlackTeam)
    public teamId: string;

    @MappedParameter(MappedParameters.SlackChannelName)
    public channel: string;

    @MappedParameter(MappedParameters.SlackUser)
    public requester: string;

    @Secret(Secrets.userToken("repo"))
    public githubToken: string;

    public handle(ctx: HandlerContext): Promise<HandlerResult> {
        return ctx.graphClient.query<graphql.ChatId.Query, graphql.ChatId.Variables>({
                name: "chatId",
                variables: {
                    teamId: this.teamId,
                    chatId: this.requester,
                },
            })
            .then(result => {
                const person = _.get(result, "ChatTeam[0].members[0].person") as graphql.ChatId.Person;
                if (person) {
                    return person;
                } else {
                    return null;
                }
            })
            .then(person => this.searchIssues(person, ctx))
            .then(result => this.sendResponse(this.prepareResponse(result), ctx))
            .then(() => Success, failure);
    }

    protected searchIssues(person: graphql.ChatId.Person, ctx: HandlerContext): Promise<any> {
        if (person && person.gitHubId) {
            const date = new Date(new Date().getTime() - (this.days * 24 * 60 * 60 * 1000));
            const login = person.gitHubId.login;
            return this.searchReposFromChannel(ctx)
                .then(repos => {
                    return github.api(this.githubToken, this.apiUrl).search.issues({
                        q: `involves:${login} updated:>=${formatDate("{year}-{month}-{day}T{hours}:{minutes}",
                            date)} ${repos}`,
                        sort: "updated",
                        order: "desc",
                    });
            });
        } else {
            return Promise.resolve(Success);
        }
    }

    protected searchReposFromChannel(ctx: HandlerContext): Promise<string> {
        if (this.channel) {
            return ctx.graphClient.query<graphql.MappedChannels.Query, graphql.MappedChannels.Variables>({
                    name: "mappedChannels",
                    variables: {
                        teamId: this.teamId,
                        name: this.channel,
                    },
                })
                .then(result => {
                    const repos = _.get(result, "ChatChannel[0].repos") as graphql.MappedChannels.Repos[] || [];
                    return repos.map(r => `repo:${r.owner}/${r.name}`).join(" ");
                });
        } else {
            return Promise.resolve("");
        }
    }

    protected sendResponse(message: SlackMessage | string, ctx: HandlerContext): Promise<any> {
        return ctx.messageClient.respond(message);
    }

    protected prepareResponse(result: any): SlackMessage | string {
        if (result && result.data && result.data.items && result.data.items.length > 0) {
            return this.renderIssues(result.data.items, this.apiUrl);
        } else {
            return `No issues/pull requests found`;
        }
    }

    protected renderIssues(issues: any[], apiUrl: string): SlackMessage {
        // let's filter out the testing issues
        const attachments = issues.map(issue => {
            const issueTitle = `#${issue.number}: ${issue.title}`;
            const text = `${url(issue.html_url, issueTitle)}`;
            const repoSlug = issue.repository_url.slice(`${apiUrl}/repos`.length);

            const attachment: Attachment = {
                fallback: escape(issueTitle),
                mrkdwn_in: ["text"],
                text,
                footer: `${url(issue.html_url.split(`/${issue.pull_request
                    ? "pulls" : "issues"}/${issue.number}`)[0], repoSlug)}`,
                ts: Math.floor(new Date(issue.updated_at).getTime() / 1000),
            };
            if (issue.assignee) {
                attachment.author_link = issue.assignee.html_url;
                attachment.author_name = `@${issue.assignee.login}`;
                attachment.author_icon = issue.assignee.avatar_url;
            }
            if (issue.state === "closed") {
                attachment.footer_icon = `https://images.atomist.com/rug/${issue.pull_request
                    ? "pull-request" : "issue"}-closed.png`;
                attachment.color = "#bd2c00";
            } else {
                attachment.footer_icon = `https://images.atomist.com/rug/${issue.pull_request
                    ? "pull-request" : "issue"}-open.png`;
                attachment.color = "#6cc644";
            }

            attachment.actions = this.createActions(issue);

            return attachment;
        });

        return {
            attachments,
        };
    }

    protected createActions(issue: any): Action[] {
        return [];
    }

}
