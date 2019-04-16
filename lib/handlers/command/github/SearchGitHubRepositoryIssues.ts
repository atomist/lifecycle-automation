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
    buttonForCommand,
    guid,
    HandlerContext,
    MappedParameter,
    MappedParameters,
    Parameter,
    Secret,
    Secrets,
    Tags,
} from "@atomist/automation-client";
import { ConfigurableCommandHandler } from "@atomist/automation-client/lib/decorators";
import { HandleCommand } from "@atomist/automation-client/lib/HandleCommand";
import {
    Action,
    Attachment,
    codeLine,
    SlackMessage,
} from "@atomist/slack-messages";
import * as graphql from "../../../typings/types";
import * as github from "./gitHubApi";
import { ListMyGitHubIssues } from "./ListMyGitHubIssues";

@ConfigurableCommandHandler("Search issues and pull requests in GitHub repositories", {
    intent: [ "search issues", "search github issues" ],
    autoSubmit: true,
})
@Tags("github", "issue")
export class SearchGitHubRepositoryIssues extends ListMyGitHubIssues implements HandleCommand {

    @Parameter({ description: "issue search term", pattern: /^.*$/, required: false })
    public q: string = "is:open is:issue";

    @Parameter({ description: "results per page", pattern: /^[0-9]*$/, required: false })
    public perPage: number = 5;

    @Parameter({ description: "results page", pattern: /^[0-9]*$/, required: false })
    public page: number = 1;

    @Parameter({ description: "search Id", pattern: /^.*$/, required: false })
    public id: string;

    @MappedParameter(MappedParameters.GitHubRepository)
    public repo: string;

    @MappedParameter(MappedParameters.GitHubOwner)
    public owner: string;

    @MappedParameter(MappedParameters.GitHubApiUrl)
    public apiUrl: string;

    @MappedParameter(MappedParameters.SlackChannelName)
    public channel: string;

    @Secret(Secrets.userToken("repo"))
    public gitHubToken: string;

    protected searchIssues(person: graphql.ChatId.Person): Promise<any> {
        if (+this.page > 0) {
            return github.api(this.gitHubToken, this.apiUrl).search.issues({
                q: `${this.q} repo:${this.owner}/${this.repo}`,
                sort: "updated",
                order: "desc",
                page: this.page,
                per_page: this.perPage,
            });
        } else {
            return Promise.resolve(null);
        }
    }

    protected sendResponse(message: SlackMessage | string, ctx: HandlerContext): Promise<any> {
        return ctx.messageClient.respond(message, { id: this.id });
    }

    protected prepareResponse(result: any): SlackMessage | string {
        if (!this.id) {
            this.id = `issue_search/${guid()}`;
        }
        let response: SlackMessage;
        if (result) {
            response = super.prepareResponse(result) as SlackMessage;
            if (response.attachments) {
                const actions: Action[] = [];
                // Back
                if (this.page > 1) {
                    actions.push(buttonForCommand({ text: "Back" }, "SearchGitHubRepositoryIssues", {
                        q: this.q,
                        page: Math.floor(+this.page - 1),
                        repo: this.repo,
                        owner: this.owner,
                        id: this.id,
                    }));
                }
                // Next
                if (+this.page * +this.perPage < result.data.total_count) {
                    actions.push(buttonForCommand({ text: "Next" }, "SearchGitHubRepositoryIssues", {
                        q: this.q,
                        page: Math.floor(+this.page + 1),
                        repo: this.repo,
                        owner: this.owner,
                        id: this.id,
                    }));
                }
                actions.push(buttonForCommand({ text: "Collapse" }, "SearchGitHubRepositoryIssues", {
                    q: this.q,
                    page: "0",
                    repo: this.repo,
                    owner: this.owner,
                    id: this.id,
                }));
                const pagingAttachment: Attachment = {
                    fallback: "Paging",
                    footer: `Search: ${this.q} \u00B7 Total results: ${result.data.total_count}`
                    + ` \u00B7 Page: ${this.page} of ${Math.ceil(result.data.total_count / +this.perPage)}`,
                    ts: Math.floor(Date.now() / 1000),
                    actions,
                };
                response.attachments.push(pagingAttachment);
            }
        } else {
            const actions: Action[] = [];
            actions.push(buttonForCommand({ text: "Expand" }, "SearchGitHubRepositoryIssues", {
                q: this.q,
                page: 1,
                repo: this.repo,
                owner: this.owner,
                id: this.id,
            }));

            response = {
                attachments: [{
                    text: `Search results for ${codeLine(this.q)} collapsed`,
                    fallback: "Paging",
                    mrkdwn_in: ["text"],
                    actions,
                    ts: Math.floor(Date.now() / 1000),
                },
                ],
            };
        }
        return response;
    }

    protected createActions(issue: any): Action[] {
        let command;
        if (issue.pull_request) {
            command = "DisplayGitHubPullRequest";
        } else {
            command = "DisplayGitHubIssue";
        }
        return [
            buttonForCommand({ text: "Details" },
                command, { owner: this.owner, repo: this.repo, issue: issue.number }),
        ];
    }
}
