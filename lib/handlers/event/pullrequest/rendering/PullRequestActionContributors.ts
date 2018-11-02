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
    menuForCommand,
    MenuSpecification,
} from "@atomist/automation-client";
import { ApolloGraphClient } from "@atomist/automation-client/lib/graph/ApolloGraphClient";
import { Action } from "@atomist/slack-messages";
import * as _ from "lodash";
import {
    AbstractIdentifiableContribution,
    RendererContext,
    SlackActionContributor,
} from "../../../../lifecycle/Lifecycle";
import * as graphql from "../../../../typings/types";
import { isGenerated } from "../../../../util/helpers";
import * as github from "../../../command/github/gitHubApi";
import { DefaultGitHubApiUrl } from "../../../command/github/gitHubApi";
import { LifecycleActionPreferences } from "../../preferences";
import { isPrAutoMergeEnabled } from "../autoMerge";

const SuggestedReviewersQuery = `query SuggestedReviewers($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $number) {
      suggestedReviewers {
        reviewer {
          login
        }
      }
    }
  }
}
`;

export class MergeActionContributor extends AbstractIdentifiableContribution
    implements SlackActionContributor<graphql.PullRequestToPullRequestLifecycle.PullRequest> {

    constructor() {
        super(LifecycleActionPreferences.pull_request.merge.id);
    }

    public supports(node: any): boolean {
        if (node.baseBranchName) {
            const pr = node as graphql.PullRequestToPullRequestLifecycle.PullRequest;
            return pr.state === "open" && (pr.reviews == null || !pr.reviews.some(r => r.state !== "approved"));
        } else {
            return false;
        }
    }

    public buttonsFor(pr: graphql.PullRequestToPullRequestLifecycle.PullRequest, context: RendererContext):
        Promise<Action[]> {
        const repo = context.lifecycle.extract("repo");
        const buttons: Action[] = [];

        if (context.rendererId === "status") {
            const mergeButtons = this.mergePRActions(pr, repo);

            const commits = pr.commits.filter(c => c.statuses != null && c.statuses.length > 0)
                    .sort((c1, c2) => c2.timestamp.localeCompare(c1.timestamp));
            if (commits.length > 0) {
                const commit = commits[0];
                if (!commit.statuses.some(s => s.state !== "success")) {
                    buttons.push(...mergeButtons);
                }
            } else {
                buttons.push(...mergeButtons);
            }
        }
        return Promise.resolve(buttons);
    }

    public menusFor(pr: graphql.PullRequestToPullRequestLifecycle.PullRequest, context: RendererContext):
        Promise<Action[]> {
        return Promise.resolve([]);
    }

    private mergePRActions(pr: graphql.PullRequestToPullRequestLifecycle.PullRequest,
                           repo: graphql.PullRequestFields.Repo): Action[] {
        const buttons: Action[] = [];
        const mergeMethods = {
            merge: undefined,
            squash: undefined,
            rebase: undefined,
        };
        const title = `Merge pull request #${pr.number} from ${pr.repo.owner}/${pr.repo.name}`;
        const message = pr.title;
        if (repo.allowMergeCommit === true) {
            mergeMethods.merge = {
                method: "Merge",
                title,
                message,
            };
        }
        if (repo.allowSquashMerge === true && !isGenerated(pr)) {
            mergeMethods.squash = {
                method: "Squash and Merge",
                title: `${pr.head.message} (#${pr.number})`,
                message: `${pr.title}\n\n${pr.commits.map(c => `* ${c.message}`).join("\n")}`,
            };
        }
        if (repo.allowRebaseMerge === true && !isGenerated(pr)) {
            mergeMethods.rebase = {
                method: "Rebase and Merge",
                title,
                message,
            };
        }
        if (repo.allowMergeCommit === undefined
            && repo.allowSquashMerge === undefined
            && repo.allowRebaseMerge === undefined) {
            mergeMethods.merge = {
                method: "Merge",
                title,
                message,
            };
        }

        _.forIn(mergeMethods, (v, k) => {
            if (v) {
                buttons.push(buttonForCommand(
                    { text: v.method, role: "global" },
                    "MergeGitHubPullRequest",
                    {
                        issue: pr.number,
                        repo: repo.name,
                        owner: repo.owner,
                        title: v.title,
                        message: v.message,
                        mergeMethod: k,
                        sha: pr.head.sha,
                    }));
            }
        });

        return buttons;
    }

}

export class AutoMergeActionContributor extends AbstractIdentifiableContribution
    implements SlackActionContributor<graphql.PullRequestToPullRequestLifecycle.PullRequest> {

    constructor() {
        super(LifecycleActionPreferences.pull_request.auto_merge.id);
    }

    public supports(node: any): boolean {
        if (isGenerated(node)) {
            return false;
        } else if (node.baseBranchName) {
            const pr = node as graphql.PullRequestToPullRequestLifecycle.PullRequest;
            return pr.state === "open" && !isPrAutoMergeEnabled(pr);
        } else {
            return false;
        }
    }

    public buttonsFor(pr: graphql.PullRequestToPullRequestLifecycle.PullRequest,
                      context: RendererContext): Promise<Action[]> {
        const repo = context.lifecycle.extract("repo");
        const buttons = [];

        if (context.rendererId === "pull_request") {
            buttons.push(buttonForCommand(
                { text: "Enable Auto Merge", role: "global" },
                "EnableGitHubPullRequestAutoMerge",
                {
                    repo: repo.name,
                    owner: repo.owner,
                    issue: pr.number,
                }));
        }

        return Promise.resolve(buttons);
    }

    public menusFor(pr: graphql.PullRequestToPullRequestLifecycle.PullRequest,
                    context: RendererContext): Promise<Action[]> {
        return Promise.resolve([]);
    }
}

export class ApproveActionContributor extends AbstractIdentifiableContribution
    implements SlackActionContributor<graphql.PullRequestToPullRequestLifecycle.PullRequest> {

    constructor() {
        super(LifecycleActionPreferences.pull_request.approve.id);
    }

    public supports(node: any): boolean {
        if (isGenerated(node)) {
            return false;
        } else if (node.baseBranchName) {
            const pr = node as graphql.PullRequestToPullRequestLifecycle.PullRequest;
            return pr.state === "open"
                && pr.commits != null && pr.commits.length > 0;
        } else {
            return false;
        }
    }

    public buttonsFor(pr: graphql.PullRequestToPullRequestLifecycle.PullRequest,
                      context: RendererContext): Promise<Action[]> {
        const repo = context.lifecycle.extract("repo");
        const buttons = [];

        if (context.rendererId === "status") {
            const commits = pr.commits.sort((c1, c2) => c2.timestamp.localeCompare(c1.timestamp))
                .filter(c => c.statuses != null && c.statuses.length > 0);

            if (commits.length > 0 && commits[0].statuses != null) {
                const commit = commits[0];
                commit.statuses.filter(s => s.context === "fingerprint/atomist" && s.state === "failure").forEach(s => {
                    buttons.push(buttonForCommand(
                        { text: "Approve", role: "global" },
                        "ApproveGitHubCommit",
                        {
                            repo: repo.name,
                            owner: repo.owner,
                            shas: commit.sha,
                            targetUrl: s.targetUrl,
                            description: s.description,
                        }));
                });
            }
        }

        return Promise.resolve(buttons);
    }

    public menusFor(pr: graphql.PullRequestToPullRequestLifecycle.PullRequest,
                    context: RendererContext): Promise<Action[]> {
        return Promise.resolve([]);
    }
}

export class DeleteActionContributor extends AbstractIdentifiableContribution
    implements SlackActionContributor<graphql.PullRequestToPullRequestLifecycle.PullRequest> {

    constructor() {
        super(LifecycleActionPreferences.pull_request.delete.id);
    }

    public supports(node: any): boolean {
        if (node.baseBranchName) {
            const pr = node as graphql.PullRequestToPullRequestLifecycle.PullRequest;
            return pr.state === "closed"
                && pr.branch != null
                && pr.branch.name !== (pr.repo.defaultBranch || "master");
        } else {
            return false;
        }
    }

    public buttonsFor(pr: graphql.PullRequestToPullRequestLifecycle.PullRequest, context: RendererContext):
        Promise<Action[]> {
        const repo = context.lifecycle.extract("repo");
        const buttons = [];

        if (context.rendererId === "pull_request") {
            buttons.push(buttonForCommand({ text: "Delete Branch", role: "global" }, "DeleteGitHubBranch",
                { branch: pr.branch.name, repo: repo.name, owner: repo.owner }));
        }

        return Promise.resolve(buttons);
    }

    public menusFor(pr: graphql.PullRequestToPullRequestLifecycle.PullRequest, context: RendererContext):
        Promise<Action[]> {
        return Promise.resolve([]);
    }
}

export class CommentActionContributor extends AbstractIdentifiableContribution
    implements SlackActionContributor<graphql.PullRequestToPullRequestLifecycle.PullRequest> {

    constructor() {
        super(LifecycleActionPreferences.pull_request.comment.id);
    }

    public supports(node: any): boolean {
        if (isGenerated(node)) {
            return false;
        } else {
            return node.baseBranchName
                && (node as graphql.PullRequestToPullRequestLifecycle.PullRequest).state === "open";
        }
    }

    public buttonsFor(pr: graphql.PullRequestToPullRequestLifecycle.PullRequest, context: RendererContext):
        Promise<Action[]> {
        const repo = context.lifecycle.extract("repo");
        const buttons = [];

        if (context.rendererId === "pull_request") {
            buttons.push(buttonForCommand({ text: "Comment", role: "comment" }, "CommentGitHubIssue",
                { issue: pr.number, repo: repo.name, owner: repo.owner }));
        }

        return Promise.resolve(buttons);
    }

    public menusFor(pr: graphql.PullRequestToPullRequestLifecycle.PullRequest, context: RendererContext):
        Promise<Action[]> {
        return Promise.resolve([]);
    }
}

export class ThumbsUpActionContributor extends AbstractIdentifiableContribution
    implements SlackActionContributor<graphql.PullRequestToPullRequestLifecycle.PullRequest> {

    constructor() {
        super(LifecycleActionPreferences.pull_request.thumps_up.id);
    }

    public supports(node: any): boolean {
        if (isGenerated(node)) {
            return false;
        } else {
            return node.baseBranchName
                && (node as graphql.PullRequestToPullRequestLifecycle.PullRequest).state === "open";
        }
    }

    public buttonsFor(pr: graphql.PullRequestToPullRequestLifecycle.PullRequest, context: RendererContext):
        Promise<Action[]> {
        const repo = context.lifecycle.extract("repo");

        if (context.rendererId === "pull_request") {

            const api = github.api(context.orgToken);
            return api.reactions.getForIssue({
                owner: repo.owner,
                repo: repo.name,
                number: pr.number,
                content: "+1",
            })
            .then(result =>
                [buttonForCommand(
                    { text: `:+1:${result.data.length > 0 ? " " + result.data.length : ""}`, role: "react" },
                    "ReactGitHubIssue",
                    { reaction: "+1", issue: pr.number, repo: repo.name, owner: repo.owner })],
            )
            .catch(() =>
                [buttonForCommand(
                    { text: ":+1:", role: "react" },
                    "ReactGitHubIssue",
                    { reaction: "+1", issue: pr.number, repo: repo.name, owner: repo.owner })],
            );
        }

        return Promise.resolve([]);
    }

    public menusFor(pr: graphql.PullRequestToPullRequestLifecycle.PullRequest,
                    context: RendererContext): Promise<Action[]> {
        return Promise.resolve([]);
    }
}

export class AssignReviewerActionContributor extends AbstractIdentifiableContribution
    implements SlackActionContributor<graphql.PullRequestToPullRequestLifecycle.PullRequest> {

    constructor() {
        super(LifecycleActionPreferences.pull_request.assign_reviewer.id);
    }

    public supports(node: any): boolean {
        if (isGenerated(node)) {
            return false;
        } else {
            return node.baseBranchName
                && (node as graphql.PullRequestToPullRequestLifecycle.PullRequest).state === "open";
        }
    }

    public buttonsFor(pr: graphql.PullRequestToPullRequestLifecycle.PullRequest, context: RendererContext):
        Promise<Action[]> {
        const repo = context.lifecycle.extract("repo") as graphql.PullRequestFields.Repo;

        if (context.rendererId === "pull_request") {
            if (repo.org &&
                repo.org.provider &&
                repo.org.provider.apiUrl === DefaultGitHubApiUrl &&
                context.orgToken) {
                return this.assignReviewMenu(pr, repo, context.orgToken);
            } else {
                return Promise.resolve(this.assignReviewButton(pr, repo));
            }
        }
        return Promise.resolve([]);
    }

    public menusFor(pr: graphql.PullRequestToPullRequestLifecycle.PullRequest,
                    context: RendererContext): Promise<Action[]> {
        return Promise.resolve([]);
    }

    private assignReviewMenu(pr: graphql.PullRequestToPullRequestLifecycle.PullRequest,
                             repo: graphql.PullRequestFields.Repo,
                             orgToken: string): Promise<Action[]> {

        const client = new ApolloGraphClient("https://api.github.com/graphql",
            { Authorization: `bearer ${orgToken}` });

        return client.query<any, any>({
                query: SuggestedReviewersQuery,
                variables: {
                    owner: repo.owner,
                    name: repo.name,
                    number: pr.number,
                },
            })
            .then(result => {
                const reviewers = _.get(result, "repository.pullRequest.suggestedReviewers");

                if (reviewers && reviewers.length > 0) {
                    const logins = reviewers.filter(r => r.reviewer && r.reviewer.login)
                        .map(r => r.reviewer.login);
                    const menu: MenuSpecification = {
                        text: "Request Review",
                        options: [{
                            text: "Suggestions", options: logins.map(l => {
                                return { text: l, value: l };
                            }),
                        },
                            { text: "Everybody", options: [{ text: "request different reviewer", value: "_"}]},
                        ],
                        role: "global",
                    };
                    return [ menuForCommand(menu,
                        "AssignGitHubPullRequestReviewer", "reviewer",
                        { issue: pr.number, repo: repo.name, owner: repo.owner }) ];

                } else {
                    return this.assignReviewButton(pr, repo);
                }

            })
            .catch(() => {
                return this.assignReviewButton(pr, repo);
            });
    }

    private assignReviewButton(pr: graphql.PullRequestToPullRequestLifecycle.PullRequest,
                               repo: graphql.PullRequestFields.Repo): Action[] {
        return [ buttonForCommand({ text: "Request Review" }, "AssignGitHubPullRequestReviewer",
            { issue: pr.number, repo: repo.name, owner: repo.owner }) ];
    }
}
