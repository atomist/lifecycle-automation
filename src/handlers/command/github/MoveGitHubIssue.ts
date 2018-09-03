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
import { commandHandlerFrom } from "@atomist/automation-client/onCommand";
import * as slack from "@atomist/slack-messages";
import { codeLine } from "@atomist/slack-messages";
import {
    success,
    warning,
} from "../../../util/messages";
import * as github from "./gitHubApi";
import {
    IssueOwnerParameters,
    ownerSelection,
    RepoParameters,
    repoSelection,
} from "./targetOrgAndRepo";

@ConfigurableCommandHandler("Moves a GitHub issue to a different org and/or repo", {
    autoSubmit: true,
    intent: ["move issue", "move github issue"],
})
@Tags("github", "issue")
export class MoveGitHubIssue implements HandleCommand {

    @Parameter({ description: "target owner name", pattern: /^.*$/ })
    public targetOwner: string;

    @Parameter({ description: "target repository name", pattern: /^.*$/ })
    public targetRepo: string;

    @Parameter({ description: "issue number", pattern: /^.*$/ })
    public issue: number;

    @Parameter({ description: "message id", required: false, displayable: false })
    public msgId: string;

    @MappedParameter(MappedParameters.GitHubRepository)
    public repo: string;

    @MappedParameter(MappedParameters.GitHubOwner)
    public owner: string;

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

        // Validate that target and source aren't same #201
        if (this.owner === this.targetOwner && this.repo === this.targetRepo) {
            return ctx.messageClient.respond(
                warning("Move Issue", `Can't move issue into selected repository ${
                    codeLine(`${this.targetOwner}/${this.targetRepo}`)}`, ctx))
                .then(() => Success, failure);
        }

        const api = github.api(this.githubToken, this.apiUrl);

        return api.issues.get({
            owner: this.owner,
            repo: this.repo,
            number: this.issue,
        })
        .then(issue => {
            return api.issues.getComments({
                owner: this.owner,
                repo: this.repo,
                number: this.issue,
            })
            .then(result => {
                return [issue.data, result.data];
            });
        })
        .then(([issue, comment]) => {
            const comments = comment.map(c => `
---
Comment by @${c.user.login} at ${c.created_at}:

${c.body}`).join("\n");

            const body = `Issue moved from ${this.owner}/${this.repo}#${this.issue}

Created by @${issue.user.login} at ${issue.created_at}:

${issue.body}
${comments}`;

            return api.issues.create({
                owner: this.targetOwner,
                repo: this.targetRepo,
                title: issue.title,
                body,
                labels: issue.labels.map(l => l.name),
                assignees: issue.assignees.map(a => a.login),
            });
        })
        .then(newIssue => {
            return api.issues.createComment({
                owner: this.owner,
                repo: this.repo,
                number: this.issue,
                body: `Issue moved to ${this.targetOwner}/${this.targetRepo}#${newIssue.data.number}`,
            })
            .then(() => {
                return api.issues.edit({
                    owner: this.owner,
                    repo: this.repo,
                    number: this.issue,
                    state: "closed",
                });
            })
            .then(() => {
                const issueLink = slack.url(newIssue.data.html_url,
                    `${this.targetOwner}/${this.targetRepo}#${newIssue.data.number}`);
                return ctx.messageClient.respond(success(
                    "Move Issue",
                    `Successfully moved issue ${issueLink}`),
                    { id: this.msgId});
            });
        })
        .then(() => Success)
        .catch(err => {
            return github.handleError("Move Issue", err, ctx, { id: this.msgId });
        });
    }
}

export function moveGitHubIssueTargetOwnerSelection(): HandleCommand<IssueOwnerParameters> {
    return commandHandlerFrom(
        ownerSelection(
            "Move issue",
            "Select organization to move issue to:",
            "moveGitHubIssueTargetRepoSelection",
        ),
        IssueOwnerParameters,
        "moveGitHubIssueTargetOwnerSelection",
        "Move a GitHub issue to a different org and/or repo",
        [],
    );
}

export function moveGitHubIssueTargetRepoSelection(): HandleCommand<RepoParameters> {
    return commandHandlerFrom(
        repoSelection(
            "Move issue",
            "Select repository within %ORG% to move issue to:",
            "moveGitHubIssueTargetOwnerSelection",
            "MoveGitHubIssue",
        ),
        RepoParameters,
        "moveGitHubIssueTargetRepoSelection",
        "Move a GitHub issue to a different org and/or repo",
        [],
    );
}
