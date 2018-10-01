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
    Parameters,
    Secret,
    Secrets,
    Success,
    Tags,
} from "@atomist/automation-client";
import { guid } from "@atomist/automation-client/internal/util/string";
import { commandHandlerFrom } from "@atomist/automation-client/onCommand";
import {
    addressEvent,
    buttonForCommand,
    menuForCommand,
} from "@atomist/automation-client/spi/message/MessageClient";
import * as slack from "@atomist/slack-messages";
import {
    bold,
    SlackMessage,
} from "@atomist/slack-messages";
import * as _ from "lodash";
import { IssueRelationship } from "../../../ingesters/issueRelationship";
import * as types from "../../../typings/types";
import { success } from "../../../util/messages";
import * as github from "./gitHubApi";
import {
    IssueOwnerParameters,
    ownerSelection,
    RepoParameters,
    repoSelection,
    retrieveIssue,
} from "./targetOrgAndRepo";

@ConfigurableCommandHandler("Link a related GitHub issue in a different org and/or repo", {
    autoSubmit: true,
    intent: ["link issue", "link github issue"],
})
@Tags("github", "issue")
export class LinkRelatedGitHubIssue implements HandleCommand {

    @Parameter({ description: "target owner name", pattern: /^.*$/ })
    public targetOwner: string;

    @Parameter({ description: "target repository name", pattern: /^.*$/ })
    public targetRepo: string;

    @Parameter({ description: "target issue number", pattern: /^.*$/ })
    public targetIssue: number;

    @Parameter({ description: "issue number", pattern: /^.*$/ })
    public issue: number;

    @Parameter({ description: "message id", required: false, displayable: false })
    public msgId: string;

    @MappedParameter(MappedParameters.GitHubRepository)
    public repo: string;

    @MappedParameter(MappedParameters.GitHubOwner)
    public owner: string;

    @MappedParameter(MappedParameters.GitHubUrl)
    public url: string;

    @MappedParameter(MappedParameters.GitHubApiUrl)
    public apiUrl: string;

    @Secret(Secrets.userToken("repo"))
    public githubToken: string;

    public handle(ctx: HandlerContext): Promise<HandlerResult> {
        try {
            this.targetOwner = JSON.parse(this.targetOwner).owner;
        } catch (err) {
            // Safe to ignore
        }

        const issueRel: IssueRelationship = {
            relationshipId: guid(),
            type: "related",
            state: "open",
            source: {
                owner: this.owner,
                repo: this.repo,
                issue: this.issue.toString(),
            },
            target: {
                owner: this.targetOwner,
                repo: this.targetRepo,
                issue: this.targetIssue.toString(),
            },
        };
        return ctx.messageClient.send(issueRel, addressEvent("IssueRelationship"))
            .then(() => {
                const issueLink =  slack.url(
                    `${this.url}/${this.targetOwner}/${this.targetRepo}/issues/${this.targetIssue}`,
                    `${this.targetOwner}/${this.targetRepo}#${this.targetIssue}`);
                return ctx.messageClient.respond(success(
                    "Related Issue",
                    `Successfully linked related issue ${issueLink}`),
                    { id: this.msgId });
            })
            .then(() => {
                const api = github.api(this.githubToken, this.apiUrl);

                return api.issues.createComment({
                    owner: this.owner,
                    repo: this.repo,
                    number: this.issue,
                    body: `Related issue ${this.targetOwner}/${this.targetRepo}#${this.targetIssue} linked`,
                })
                .then(() => api.issues.createComment({
                    owner: this.targetOwner,
                    repo: this.targetRepo,
                    number: this.targetIssue,
                    body: `Issue ${this.owner}/${this.repo}#${this.issue} was linked`,
                }));
            })
            .then(() => Success, failure);
    }
}

export function linkRelatedGitHubIssueTargetOwnerSelection(): HandleCommand<IssueOwnerParameters> {
    return commandHandlerFrom(
        ownerSelection(
            "Link related issue",
            "Select organization to link issue to:",
            "linkRelatedGitHubIssueTargetRepoSelection",
        ),
        IssueOwnerParameters,
        "linkRelatedGitHubIssueTargetOwnerSelection",
        "Link a related GitHub issue in a different org and/or repo",
        [],
    );
}

export function linkRelatedGitHubIssueTargetRepoSelection(): HandleCommand<RepoParameters> {
    return commandHandlerFrom(
        repoSelection(
            "Link related issue",
            "Select repository within %ORG% to link issue to:",
            "linkRelatedGitHubIssueTargetOwnerSelection",
            "linkRelatedGitHubIssueTargetIssueSelection",
        ),
        RepoParameters,
        "linkRelatedGitHubIssueTargetRepoSelection",
        "Link a related GitHub issue in a different org and/or repo",
        [],
    );
}

export function linkRelatedGitHubIssueTargetIssueSelection(): HandleCommand<IssueParameters> {
    return commandHandlerFrom(
        issueSelection(
            "Link related issue",
            "Select issue within %SLUG% to link to:",
            "linkRelatedGitHubIssueTargetRepoSelection",
            "LinkRelatedGitHubIssue",
        ),
        IssueParameters,
        "linkRelatedGitHubIssueTargetIssueSelection",
        "Link a related GitHub issue in a different org and/or repo",
        [],
    );
}

@Parameters()
export class IssueParameters extends RepoParameters {

    @MappedParameter(MappedParameters.GitHubAllRepositories)
    public targetRepo: string;

}

function issueSelection(prefix: string, text: string, previousHandler: string, nextHandler: string) {
    return async (ctx: HandlerContext, params: IssueParameters) => {
        const targetOwner = JSON.parse(params.targetOwner) as types.Orgs.Org;

        const issueResult = await ctx.graphClient.query<types.RepoIssues.Query, types.RepoIssues.Variables>({
                name: "repoIssues",
                variables: {
                    owner: targetOwner.owner,
                    name: params.targetRepo,
                },
            });

        const { title, author, authorIcon } = await retrieveIssue(ctx, params);
        text = text.replace("%SLUG%", bold(`${targetOwner.owner}/${params.targetRepo}`));

        if (issueResult &&
            issueResult.Repo &&
            issueResult.Repo.length === 1 &&
            issueResult.Repo[0].issue &&
            issueResult.Repo[0].issue.length > 0) {

            const issueChunks = _.chunk(_.cloneDeep(issueResult.Repo[0].issue), 100);

            const actions = issueChunks.map(chunk => {
                return menuForCommand(
                    {
                        text: `Issue (#${chunk[0].number}-#${chunk[chunk.length - 1].number})`,
                        options: chunk.map(issue => ({
                            text: `#${issue.number}: ${issue.title}`,
                            value: issue.number.toString() })),
                    },
                    nextHandler,
                    "targetIssue",
                    { ...params });
            });

            const msg: SlackMessage = {
                text: `${prefix} ${title}`,
                attachments: [{
                    author_name: author,
                    author_icon: authorIcon,
                    text,
                    fallback: text,
                    mrkdwn_in: ["text", "title"],
                    actions,
                }, {
                    fallback: "Actions",
                    actions: [
                        buttonForCommand({ text: "Change Repository" }, previousHandler, {
                            msgId: params.msgId,
                            issue: params.issue,
                            owner: params.owner,
                            repo: params.repo,
                            targetOwner: params.targetOwner,
                        }),
                    ],
                }],
            };
            await ctx.messageClient.respond(msg, { id: params.msgId });
        }
        return Success;
    };
}
