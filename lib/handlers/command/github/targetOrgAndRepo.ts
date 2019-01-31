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
    buttonForCommand,
    guid,
    HandlerContext,
    MappedParameter,
    MappedParameters,
    menuForCommand,
    Parameter,
    Parameters,
    Success,
} from "@atomist/automation-client";
import {
    bold,
    SlackMessage,
    url,
} from "@atomist/slack-messages";
import * as _ from "lodash";
import * as types from "../../../typings/types";
import {
    avatarUrl,
    issueUrl,
} from "../../../util/helpers";

@Parameters()
export class OwnerParameters {

    @Parameter({ description: "message id", required: false, displayable: false })
    public msgId: string;

    @MappedParameter(MappedParameters.GitHubRepository)
    public repo: string;

    @MappedParameter(MappedParameters.GitHubOwner)
    public owner: string;

}

@Parameters()
export class IssueOwnerParameters extends OwnerParameters {

    @Parameter({ description: "issue number", pattern: /^.*$/ })
    public issue: number;

}

@Parameters()
export class RepoParameters extends IssueOwnerParameters {

    @Parameter({ description: "owner to target organization" })
    public targetOwner: string;

}

export function ownerSelection(prefix: string, text: string, repoHandler: string) {
    return async (ctx: HandlerContext, params: IssueOwnerParameters) => {
        if (!params.msgId) {
            params.msgId = guid();
        }

        const orgResult = await ctx.graphClient.query<types.Orgs.Query, types.Orgs.Variables>("orgs");

        const { title, author, authorIcon } = await retrieveIssue(ctx, params);

        if (orgResult && orgResult.Org && orgResult.Org.length > 0) {
            const msg: SlackMessage = {
                text: `${prefix} ${title}`,
                attachments: [{
                    author_name: author,
                    author_icon: authorIcon,
                    text,
                    fallback: text,
                    mrkdwn_in: ["text", "title"],
                    actions: [
                        menuForCommand(
                            {
                                text: "Organization",
                                options: orgResult.Org.map(org => ({ text: org.owner, value: JSON.stringify(org) })),
                            },
                            repoHandler,
                            "targetOwner",
                            { ...params }),
                    ],
                }],
            };
            await ctx.messageClient.respond(msg, { id: params.msgId });
        }
        return Success;
    };
}

export function repoSelection(prefix: string, text: string, previousHandler: string, nextHandler: string) {
    return async (ctx: HandlerContext, params: RepoParameters) => {
        const targetOwner = JSON.parse(params.targetOwner) as types.Orgs.Org;

        const repoResult = await ctx.graphClient.query<types.OrgRepos.Query, types.OrgRepos.Variables>({
            name: "orgRepos",
            variables: {
                owner: targetOwner.owner,
                providerId: targetOwner.provider.providerId,
            },
        });

        const orgResult = await ctx.graphClient.query<types.Orgs.Query, types.Orgs.Variables>("orgs");

        const { title, author, authorIcon } = await retrieveIssue(ctx, params);
        text = text.replace("%ORG%", bold(targetOwner.owner));

        if (repoResult && repoResult.Repo && repoResult.Repo.length > 0) {
            const repoChunks = _.chunk(_.cloneDeep(repoResult.Repo).sort(
                (r1, r2) => r1.name.toLowerCase().localeCompare(r2.name.toLowerCase())), 100);

            const actions = repoChunks.map(chunk => {
                return menuForCommand(
                    {
                        text: `Repository (${chunk[0].name.charAt(0).toLowerCase()}-${
                            chunk[chunk.length - 1].name.charAt(0).toLowerCase()})`,
                        options: chunk.map(repo => ({ text: repo.name, value: repo.name })),
                    },
                    nextHandler,
                    "targetRepo",
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
                }],
            };

            if (orgResult && orgResult.Org && orgResult.Org.length > 1) {
                msg.attachments.push({
                    fallback: "Actions",
                    actions: [
                        buttonForCommand({ text: "Change Organization" }, previousHandler, {
                            msgId: params.msgId,
                            issue: params.issue,
                            owner: params.owner,
                            repo: params.repo,
                        }),
                    ],
                });
            }

            await ctx.messageClient.respond(msg, { id: params.msgId });
        }
        return Success;
    };
}

export const retrieveIssue = async (ctx: HandlerContext, params: IssueOwnerParameters) => {
    const issueResult = await ctx.graphClient.query<types.IssueOrPr.Query, types.IssueOrPr.Variables>({
        name: "issueOrPr",
        variables: {
            owner: params.owner,
            repo: params.repo,
            name: params.issue.toString(),
        },
    });

    let title;
    let author;
    let authorIcon;
    const issue = _.get(issueResult, "Org[0].repo[0].issue[0]") as types.IssueOrPr.Issue;
    const repo = _.get(issueResult, "Org[0].repo[0]") as types.IssueOrPr.Repo;
    if (issue) {
        title = `${bold(url(issueUrl(repo, issue), `#${issue.number.toString()}: ${issue.title}`))}`;
        author = issue.openedBy.login;
        authorIcon = avatarUrl(repo, issue.openedBy.login);
    }
    return { title, author, authorIcon };
};
