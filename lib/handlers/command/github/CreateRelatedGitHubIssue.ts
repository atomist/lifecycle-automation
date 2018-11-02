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
    addressEvent,
    guid,
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
import { commandHandlerFrom } from "@atomist/automation-client/lib/onCommand";
import * as slack from "@atomist/slack-messages";
import { success } from "../../../util/messages";
import * as github from "./gitHubApi";
import {
    IssueOwnerParameters,
    ownerSelection,
    RepoParameters,
    repoSelection,
} from "./targetOrgAndRepo";

@ConfigurableCommandHandler("Create a related GitHub issue in a different org and/or repo", {
    autoSubmit: true,
    intent: ["related issue", "related github issue"],
})
@Tags("github", "issue")
export class CreateRelatedGitHubIssue implements HandleCommand {

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

        const api = github.api(this.githubToken, this.apiUrl);

        return api.issues.get({
            owner: this.owner,
            repo: this.repo,
            number: this.issue,
        })
        .then(result => {
            const issue = result.data;
            const body = `Issue originated from ${this.owner}/${this.repo}#${this.issue}

Created by @${issue.user.login} at ${issue.created_at}:

${issue.body}`;
            return api.issues.create({
                owner: this.targetOwner,
                repo: this.targetRepo,
                title: issue.title,
                body,
                labels: issue.labels.map(l => l.name),
            });
        })
        .then(newIssue => {
            const issueRel = {
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
                    issue: newIssue.data.number.toString(),
                },
            };
            return ctx.messageClient.send(issueRel, addressEvent("IssueRelationship"))
                .then(() => newIssue);
        })
        .then(newIssue => {
            return api.issues.createComment({
                owner: this.owner,
                repo: this.repo,
                number: this.issue,
                body: `Related issue ${this.targetOwner}/${this.targetRepo}#${newIssue.data.number} created`,
            }).then(() => newIssue);
        })
        .then(newIssue => {
            const issueLink = slack.url(newIssue.data.html_url,
                `${this.targetOwner}/${this.targetRepo}#${newIssue.data.number}`);
            return ctx.messageClient.respond(success(
                "Related Issue",
                `Successfully created related issue ${issueLink}`),
                { id: this.msgId });
        })
        .then(() => Success)
        .catch(err => {
            return github.handleError("Create Related Issue", err, ctx);
        });
    }

}

export function createRelatedGitHubIssueTargetOwnerSelection(): HandleCommand<IssueOwnerParameters> {
    return commandHandlerFrom(
        ownerSelection(
            "Create related issue",
            "Select organization to create related issue in:",
            "createRelatedGitHubIssueTargetRepoSelection",
        ),
        IssueOwnerParameters,
        "createRelatedGitHubIssueTargetOwnerSelection",
        "Create a related GitHub issue in a different org and/or repo",
        [],
    );
}

export function createRelatedGitHubIssueTargetRepoSelection(): HandleCommand<RepoParameters> {
    return commandHandlerFrom(
        repoSelection(
            "Create related issue",
            "Select repository within %ORG% to create related issue in:",
            "createRelatedGitHubIssueTargetOwnerSelection",
            "CreateRelatedGitHubIssue",
        ),
        RepoParameters,
        "createRelatedGitHubIssueTargetRepoSelection",
        "Create a related GitHub issue in a different org and/or repo",
        [],
    );
}
