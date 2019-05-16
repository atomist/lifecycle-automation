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
    menuForCommand,
    MenuSpecification,
    TokenCredentials,
} from "@atomist/automation-client";
import { Action } from "@atomist/slack-messages";
import {
    AbstractIdentifiableContribution,
    RendererContext,
    SlackActionContributor,
} from "../../../../lifecycle/Lifecycle";
import * as graphql from "../../../../typings/types";
import * as github from "../../../command/github/gitHubApi";
import { LifecycleActionPreferences } from "../../preferences";

export abstract class AbstractCommentActionContributor extends AbstractIdentifiableContribution
    implements SlackActionContributor<any> {

    constructor(private readonly identifier: string, private readonly forIssue: boolean, private readonly forPr: boolean) {
        super(identifier);
    }

    public supports(node: any): boolean {
        if (node.body && (node.issue || node.pullRequest)) {
            const comment = node;
            return (comment.issue != undefined && comment.issue.state === "open")
                || (comment.pullRequest != undefined && comment.pullRequest.state === "open");
        } else {
            return false;
        }
    }

    public buttonsFor(comment: any, context: RendererContext):
        Promise<Action[]> {
        const repo = context.lifecycle.extract("repo");
        const issue = context.lifecycle.extract("issue");
        const pr = context.lifecycle.extract("pullrequest");

        if (context.rendererId === "issue_comment" || context.rendererId === "pullrequest_comment") {
            let button;

            if (this.forIssue && issue != undefined) {
                button = this.createButton(comment, issue.number, repo, context);
            } else if (this.forPr && pr != undefined) {
                button = this.createButton(comment, pr.number, repo, context);
            }

            if (button != undefined) {
                return button;
            }
        }
        return Promise.resolve([]);
    }

    public menusFor(comment: any, context: RendererContext)
        : Promise<Action[]> {
        const repo = context.lifecycle.extract("repo");
        const issue = context.lifecycle.extract("issue");
        const pr = context.lifecycle.extract("pullrequest");

        if (context.rendererId === "issue_comment" || context.rendererId === "pullrequest_comment") {
            let menu;

            if (this.forIssue && issue != undefined) {
                menu = this.createMenu(comment, issue.number, issue.labels, repo, context);
            } else if (this.forPr && pr != undefined) {
                menu = this.createMenu(comment, pr.number, (pr).labels, repo, context);
            }

            if (menu != undefined) {
                return menu;
            }
        }
        return Promise.resolve([]);
    }

    protected abstract createButton(comment: graphql.CommentToIssueCommentLifecycle.Comment,
                                    id: number,
                                    repo: graphql.CommentToIssueCommentLifecycle.Repo,
                                    context: RendererContext): Promise<Action[]>;

    protected abstract createMenu(comment: graphql.CommentToIssueCommentLifecycle.Comment,
                                  id: number,
                                  labels: graphql.CommentToIssueCommentLifecycle.Labels[],
                                  repo: graphql.CommentToIssueCommentLifecycle.Repo,
                                  context: RendererContext): Promise<Action[]>;
}

export class DetailsActionContributor extends AbstractCommentActionContributor
    implements SlackActionContributor<graphql.CommentToIssueCommentLifecycle.Comment> {

    constructor() {
        super(LifecycleActionPreferences.comment.details.id, true, false);
    }

    protected createButton(comment: graphql.CommentToIssueCommentLifecycle.Comment,
                           id: number,
                           repo: graphql.CommentToIssueCommentLifecycle.Repo): Promise<Action[]> {
        return Promise.resolve([buttonForCommand({ text: "Details" },
            "DisplayGitHubIssue",
            {
                repo: repo.name,
                owner: repo.owner,
                issue: comment.issue.number,
            })]);
    }

    protected createMenu(comment: graphql.CommentToIssueCommentLifecycle.Comment,
                         id: number,
                         labels: graphql.CommentToIssueCommentLifecycle.Labels[],
                         repo: graphql.CommentToIssueCommentLifecycle.Repo): Promise<Action[]> {
        return null;
    }
}

export class AssignActionContributor extends AbstractCommentActionContributor
    implements SlackActionContributor<graphql.CommentToIssueCommentLifecycle.Comment> {

    constructor() {
        super(LifecycleActionPreferences.comment.assign.id, true, false);
    }

    protected createButton(comment: graphql.CommentToIssueCommentLifecycle.Comment,
                           id: number,
                           repo: graphql.CommentToIssueCommentLifecycle.Repo): Promise<Action[]> {
        return Promise.resolve([buttonForCommand({ text: "Assign to Me", role: "global" }, "AssignToMeGitHubIssue", {
            issue: id,
            repo: repo.name,
            owner: repo.owner,
        })]);
    }

    protected createMenu(comment: graphql.CommentToIssueCommentLifecycle.Comment,
                         id: number,
                         labels: graphql.CommentToIssueCommentLifecycle.Labels[],
                         repo: graphql.CommentToIssueCommentLifecycle.Repo): Promise<Action[]> {
        return null;
    }
}

export class LabelActionContributor extends AbstractCommentActionContributor
    implements SlackActionContributor<graphql.CommentToIssueCommentLifecycle.Comment> {

    constructor() {
        super(LifecycleActionPreferences.comment.label.id, true, false);
    }

    protected createButton(comment: graphql.CommentToIssueCommentLifecycle.Comment,
                           id: number,
                           repo: graphql.CommentToIssueCommentLifecycle.Repo): Promise<Action[]> {
        return null;
    }

    protected createMenu(comment: graphql.CommentToIssueCommentLifecycle.Comment,
                         id: number,
                         labels: graphql.CommentToIssueCommentLifecycle.Labels[],
                         repo: graphql.CommentToIssueCommentLifecycle.Repo): Promise<Action[]> {
        let options = [];
        if (repo.labels != undefined && repo.labels.length > 0) {
            repo.labels.sort((l1, l2) => l1.name.localeCompare(l2.name))
                .forEach(l => options.push({ text: l.name, value: l.name }));
        } else {
            options = [{ text: "bug", value: "bug" }, { text: "duplicate", value: "duplicate" },
                { text: "enhancement", value: "enhancement" }, { text: "help wanted", value: "help wanted" },
                { text: "invalid", value: "invalid" }, { text: "question", value: "question" },
                { text: "wontfix", value: "wontfix" }];
        }

        const existingLabels = (labels != undefined ? labels.sort(
            (l1, l2) => l1.name.localeCompare(l2.name)).map(l => l.name) : []);
        const unusedLabels = options.filter(l => existingLabels.indexOf(l.text) < 0);

        const menu: MenuSpecification = {
            text: "Label",
            options: [{
                text: "Remove",
                options: existingLabels.map(l => ({ text: l, value: l })),
            },
                {
                    text: "Add",
                    options: unusedLabels,
                },
            ],
            role: "global",
        };

        return Promise.resolve([menuForCommand(menu, "ToggleLabelGitHubIssue", "label", {
            issue: id,
            repo: repo.name,
            owner: repo.owner,
        })]);
    }
}

export class CloseActionContributor extends AbstractCommentActionContributor
    implements SlackActionContributor<graphql.CommentToIssueCommentLifecycle.Comment> {

    constructor() {
        super(LifecycleActionPreferences.comment.close.id, true, false);
    }

    protected createButton(comment: graphql.CommentToIssueCommentLifecycle.Comment,
                           id: number,
                           repo: graphql.CommentToIssueCommentLifecycle.Repo): Promise<Action[]> {
        return Promise.resolve([buttonForCommand({ text: "Close", role: "global" }, "CloseGitHubIssue", {
            issue: id,
            repo: repo.name,
            owner: repo.owner,
        })]);
    }

    protected createMenu(comment: graphql.CommentToIssueCommentLifecycle.Comment,
                         id: number,
                         labels: graphql.CommentToIssueCommentLifecycle.Labels[],
                         repo: graphql.CommentToIssueCommentLifecycle.Repo): Promise<Action[]> {
        return null;
    }
}

export class CommentActionContributor extends AbstractCommentActionContributor
    implements SlackActionContributor<graphql.CommentToIssueCommentLifecycle.Comment> {

    constructor() {
        super(LifecycleActionPreferences.comment.comment.id, true, true);
    }

    protected createButton(comment: graphql.CommentToIssueCommentLifecycle.Comment,
                           id: number,
                           repo: graphql.CommentToIssueCommentLifecycle.Repo): Promise<Action[]> {
        return Promise.resolve([buttonForCommand({ text: "Comment", role: "comment" }, "CommentGitHubIssue", {
            issue: id,
            repo: repo.name,
            owner: repo.owner,
        })]);
    }

    protected createMenu(comment: graphql.CommentToIssueCommentLifecycle.Comment,
                         id: number,
                         labels: graphql.CommentToIssueCommentLifecycle.Labels[],
                         repo: graphql.CommentToIssueCommentLifecycle.Repo): Promise<Action[]> {
        return null;
    }
}

export class ReactionActionContributor extends AbstractCommentActionContributor
    implements SlackActionContributor<graphql.CommentToIssueCommentLifecycle.Comment> {

    constructor() {
        super(LifecycleActionPreferences.comment.thumps_up.id, true, true);
    }

    protected async createButton(comment: graphql.CommentToIssueCommentLifecycle.Comment,
                                 id: number,
                                 repo: graphql.CommentToIssueCommentLifecycle.Repo,
                                 context: RendererContext): Promise<Action[]> {
        try {
            const api = github.api((context.credentials as TokenCredentials).token);
            const result = await api.reactions.getForIssueComment({
                owner: repo.owner,
                repo: repo.name,
                id: comment.gitHubId,
                content: "+1",
            });
            return [buttonForCommand(
                { text: `:+1:${result.data.length > 0 ? " " + result.data.length : ""}`, role: "react" },
                "ReactGitHubIssueComment",
                {
                    comment: comment.gitHubId,
                    repo: repo.name,
                    owner: repo.owner,
                    reaction: "+1",
                })];
        } catch (e) {
            return [buttonForCommand(
                { text: `:+1:`, role: "react" },
                "ReactGitHubIssueComment",
                {
                    comment: comment.gitHubId,
                    repo: repo.name,
                    owner: repo.owner,
                    reaction: "+1",
                })];
        }
    }

    protected createMenu(comment: graphql.CommentToIssueCommentLifecycle.Comment,
                         id: number,
                         labels: graphql.CommentToIssueCommentLifecycle.Labels[],
                         repo: graphql.CommentToIssueCommentLifecycle.Repo): Promise<Action[]> {
        return null;
    }
}
