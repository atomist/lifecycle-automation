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

import { logger } from "@atomist/automation-client";
import { ApolloGraphClient } from "@atomist/automation-client/graph/ApolloGraphClient";
import { guid } from "@atomist/automation-client/internal/util/string";
import {
    buttonForCommand,
    menuForCommand,
    MenuSpecification,
} from "@atomist/automation-client/spi/message/MessageClient";
import { Action } from "@atomist/slack-messages/SlackMessages";
import * as _ from "lodash";
import {
    AbstractIdentifiableContribution,
    RendererContext,
    SlackActionContributor,
} from "../../../../lifecycle/Lifecycle";
import * as graphql from "../../../../typings/types";
import { isGitHubCom } from "../../../../util/helpers";
import { AssignToMe, AssignToMeGitHubIssue } from "../../../command/github/AssignToMeGitHubIssue";
import { CreateRelatedGitHubIssue } from "../../../command/github/CreateRelatedGitHubIssue";
import * as github from "../../../command/github/gitHubApi";
import { LinkRelatedGitHubIssue } from "../../../command/github/LinkRelatedGitHubIssue";
import { MoveGitHubIssue } from "../../../command/github/MoveGitHubIssue";
import { OwnerParameters } from "../../../command/github/targetOrgAndRepo";
import { LifecycleActionPreferences } from "../../preferences";

const SuggestedAssigneeQuery = `query SuggestedAssignees($name: String!, $owner: String!) {
  repository(name: $name, owner: $owner) {
    assignableUsers(first: 100) {
      nodes {
        login
      }
    }
  }
}`;

export abstract class AbstractIssueActionContributor extends AbstractIdentifiableContribution
    implements SlackActionContributor<graphql.IssueToIssueLifecycle.Issue> {

    public supports(node: any): boolean {
        return node.title && node.state === "open";
    }

    public buttonsFor(issue: graphql.IssueToIssueLifecycle.Issue, context: RendererContext): Promise<Action[]> {
        const repo = context.lifecycle.extract("repo");

        if (context.rendererId === "issue") {
            const button = this.createButton(issue, repo, context);
            if (button != null) {
                return button;
            }
        }
        return Promise.resolve([]);
    }

    public menusFor(issue: graphql.IssueToIssueLifecycle.Issue, context: RendererContext): Promise<Action[]> {
        const repo = context.lifecycle.extract("repo");

        if (context.rendererId === "issue") {
            const menu = this.createMenu(issue, repo, context);
            if (menu != null) {
                return menu;
            }
        }
        return Promise.resolve([]);
    }

    protected createButton(issue: graphql.IssueToIssueLifecycle.Issue,
                           repo: graphql.IssueFields.Repo,
                           context: RendererContext): Promise<Action[]> {
        return null;
    }

    protected createMenu(issue: graphql.IssueToIssueLifecycle.Issue,
                         repo: graphql.IssueFields.Repo,
                         context: RendererContext): Promise<Action[]> {
        return null;
    }
}

export class DisplayMoreActionContributor extends AbstractIdentifiableContribution
    implements SlackActionContributor<graphql.IssueToIssueLifecycle.Issue> {

    constructor() {
        super(LifecycleActionPreferences.issue.more.id);
    }

    public supports(node: any): boolean {
        return node.title && node.state === "open";
    }

    public buttonsFor(issue: graphql.IssueToIssueLifecycle.Issue, context: RendererContext): Promise<Action[]> {
        const repo = context.lifecycle.extract("repo");
        if (context.rendererId === "issue") {
            if (!context.has("show_more")) {
                return Promise.resolve([
                    buttonForCommand({ text: "More \u02C5" },
                        "DisplayGitHubIssue",
                        {
                            repo: repo.name,
                            owner: repo.owner,
                            issue: issue.number,
                            showMore: "more_+",
                        }),
                ]);
            } else {
                return Promise.resolve([
                    buttonForCommand({ text: "More \u02C4" },
                        "DisplayGitHubIssue",
                        {
                            repo: repo.name,
                            owner: repo.owner,
                            issue: issue.number,
                            showMore: "more_-",
                        }),
                ]);
            }
        }
        return Promise.resolve([]);
    }

    public menusFor(issue: graphql.IssueToIssueLifecycle.Issue, context: RendererContext): Promise<Action[]> {
        return Promise.resolve([]);
    }
}

export class AssignToMeActionContributor extends AbstractIdentifiableContribution
    implements SlackActionContributor<graphql.IssueToIssueLifecycle.Issue> {

    constructor(private rendererId = "more") {
        super(LifecycleActionPreferences.issue.assigntome.id);
    }

    public supports(node: any): boolean {
        return node.title && node.state === "open";
    }

    public menusFor(issue: graphql.IssueToIssueLifecycle.Issue, context: RendererContext): Promise<Action[]> {
        return Promise.resolve([]);
    }

    public buttonsFor(issue: graphql.IssueToIssueLifecycle.Issue, context: RendererContext): Promise<Action[]> {
        const repo = context.lifecycle.extract("repo");

        if (context.rendererId === this.rendererId && context.has("show_more")) {
            const handler = new AssignToMeGitHubIssue();
            handler.repo = repo.name;
            handler.owner = repo.owner;
            handler.issue = issue.number;
            handler.assignee = AssignToMe;
            return Promise.resolve([
                buttonForCommand({ text: "Assign to Me" }, handler),
            ]);
        }
        return Promise.resolve([]);
    }
}

export class MoveActionContributor extends AbstractIdentifiableContribution
    implements SlackActionContributor<graphql.IssueToIssueLifecycle.Issue> {

    constructor(private rendererId = "more") {
        super(LifecycleActionPreferences.issue.move.id);
    }

    public supports(node: any): boolean {
        return node.title && node.state === "open";
    }

    public menusFor(issue: graphql.IssueToIssueLifecycle.Issue, context: RendererContext): Promise<Action[]> {
        return Promise.resolve([]);
    }

    public buttonsFor(issue: graphql.IssueToIssueLifecycle.Issue, context: RendererContext): Promise<Action[]> {
        const repo = context.lifecycle.extract("repo") as graphql.IssueFields.Repo;

        if (context.rendererId === this.rendererId && context.has("show_more")) {
            const handler = new OwnerParameters();
            return Promise.resolve([
                buttonForCommand(
                    { text: "Move" },
                    "moveGitHubIssueTargetRepoSelection",
                    {
                        repo: repo.name,
                        owner: repo.owner,
                        targetOwner: JSON.stringify({ owner: repo.owner, ...repo.org }),
                        issue: issue.number,
                        title: issue.timestamp,
                        msgId: context.lifecycle.id,
                    }),
            ]);
        }
        return Promise.resolve([]);
    }
}

export class RelatedActionContributor extends AbstractIdentifiableContribution
    implements SlackActionContributor<graphql.IssueToIssueLifecycle.Issue> {

    constructor(private rendererId = "more") {
        super(LifecycleActionPreferences.issue.related.id);
    }

    public supports(node: any): boolean {
        return node.title && node.state === "open";
    }

    public menusFor(issue: graphql.IssueToIssueLifecycle.Issue, context: RendererContext): Promise<Action[]> {
        return Promise.resolve([]);
    }

    public buttonsFor(issue: graphql.IssueToIssueLifecycle.Issue, context: RendererContext): Promise<Action[]> {
        const repo = context.lifecycle.extract("repo");

        if (context.rendererId === this.rendererId && context.has("show_more")) {
            return Promise.resolve([
                buttonForCommand(
                    { text: "Link" },
                    "linkRelatedGitHubIssueTargetRepoSelection",
                    {
                        repo: repo.name,
                        owner: repo.owner,
                        targetOwner: JSON.stringify({ owner: repo.owner, ...repo.org }),
                        issue: issue.number,
                        title: issue.timestamp,
                        msgId: guid(),
                    }),
                buttonForCommand(
                    { text: "Create" },
                    "createRelatedGitHubIssueTargetRepoSelection",
                    {
                        repo: repo.name,
                        owner: repo.owner,
                        targetOwner: JSON.stringify({ owner: repo.owner, ...repo.org }),
                        issue: issue.number,
                        title: issue.timestamp,
                        msgId: guid(),
                    }),
            ]);
        }
        return Promise.resolve([]);
    }
}

export class AssignActionContributor extends AbstractIdentifiableContribution
    implements SlackActionContributor<graphql.IssueToIssueLifecycle.Issue> {

    constructor(private rendererId = "more") {
        super(LifecycleActionPreferences.issue.assign.id);
    }

    public supports(node: any): boolean {
        return node.title && node.state === "open";
    }

    public buttonsFor(issue: graphql.IssueToIssueLifecycle.Issue, context: RendererContext): Promise<Action[]> {
        return Promise.resolve([]);
    }

    public menusFor(issue: graphql.IssueToIssueLifecycle.Issue, context: RendererContext): Promise<Action[]> {
        const repo = context.lifecycle.extract("repo");

        if (context.rendererId === this.rendererId && context.has("show_more") && isGitHubCom(repo)) {
            const client = new ApolloGraphClient("https://api.github.com/graphql",
                { Authorization: `bearer ${context.orgToken}` });

            return client.query<any, any>({
                    query: SuggestedAssigneeQuery,
                    variables: { owner: repo.owner, name: repo.name },
                })
                .then(result => {
                    const assignees = issue.assignees.map(a => a.login);
                    const suggestedAssignees = (_.get(result, "repository.assignableUsers.nodes") || [])
                        .map(a => a.login)
                        .filter(a => !assignees.includes(a))
                        .sort((a1, a2) => a1.localeCompare(a2));

                    const menu: MenuSpecification = {
                        text: "Assign",
                        options: [
                            {
                                text: "Unassign",
                                options: assignees.map(l => ({ text: l, value: l })),
                            },
                            {
                                text: "Assign",
                                options: suggestedAssignees.map(l => ({ text: l, value: l})),
                            },
                        ],
                    };

                    const handler = new AssignToMeGitHubIssue();
                    handler.repo = repo.name;
                    handler.owner = repo.owner;
                    handler.issue = issue.number;
                    return [
                        menuForCommand(menu, handler, "assignee"),
                    ];
                })
                .catch(err => {
                    logger.warn(err);
                    return [];
                });
        }
        return Promise.resolve([]);
    }
}

export class LabelActionContributor extends AbstractIdentifiableContribution
    implements SlackActionContributor<graphql.IssueToIssueLifecycle.Issue> {

    constructor() {
        super(LifecycleActionPreferences.issue.label.id);
    }

    public supports(node: any): boolean {
        return node.title && node.state === "open";
    }

    public buttonsFor(issue: graphql.IssueToIssueLifecycle.Issue, context: RendererContext): Promise<Action[]> {
        return Promise.resolve([]);
    }

    public menusFor(issue: graphql.IssueToIssueLifecycle.Issue, context: RendererContext): Promise<Action[]> {
        const repo = context.lifecycle.extract("repo");

        if (context.rendererId === "issue") {
            let options = [];
            if (repo.labels != null && repo.labels.length > 0) {
                const labels = [...repo.labels];
                labels.sort((l1, l2) => l1.name.localeCompare(l2.name))
                    .forEach(l => options.push({ text: l.name, value: l.name }));
            } else {
                options = [{ text: "bug", value: "bug" }, { text: "duplicate", value: "duplicate" },
                    { text: "enhancement", value: "enhancement" }, { text: "help wanted", value: "help wanted" },
                    { text: "invalid", value: "invalid" }, { text: "question", value: "question" },
                    { text: "wontfix", value: "wontfix" }];
            }

            const existingLabels = (issue.labels != null ?
                issue.labels.sort((l1, l2) => l1.name.localeCompare(l2.name))
                    .map(l => l.name) : []);
            const unusedLabels = options.filter(l => existingLabels.indexOf(l.text) < 0);

            const menu: MenuSpecification = {
                text: "Label",
                options: [{
                    text: "Remove", options: existingLabels.map(l => {
                        return { text: l, value: l };
                    }),
                },
                    { text: "Add", options: unusedLabels },
                ],
            };

            return Promise.resolve([
                menuForCommand(menu,
                    "ToggleLabelGitHubIssue", "label",
                    { issue: issue.number, repo: repo.name, owner: repo.owner }),
            ]);
        }
        return Promise.resolve([]);
    }
}

export class CloseActionContributor extends AbstractIssueActionContributor
    implements SlackActionContributor<graphql.IssueToIssueLifecycle.Issue> {

    constructor() {
        super(LifecycleActionPreferences.issue.close.id);
    }

    protected createButton(issue: graphql.IssueToIssueLifecycle.Issue,
                           repo: graphql.IssueFields.Repo): Promise<Action[]> {
        return Promise.resolve([buttonForCommand({ text: "Close" },
            "CloseGitHubIssue", { issue: issue.number, repo: repo.name, owner: repo.owner })]);
    }
}

export class CommentActionContributor extends AbstractIssueActionContributor
    implements SlackActionContributor<graphql.IssueToIssueLifecycle.Issue> {

    constructor() {
        super(LifecycleActionPreferences.issue.comment.id);
    }

    protected createButton(issue: graphql.IssueToIssueLifecycle.Issue,
                           repo: graphql.IssueFields.Repo): Promise<Action[]> {
        return Promise.resolve([buttonForCommand({ text: "Comment", role: "comment" },
            "CommentGitHubIssue", { issue: issue.number, repo: repo.name, owner: repo.owner })]);
    }
}

export class ReactionActionContributor extends AbstractIssueActionContributor
    implements SlackActionContributor<graphql.IssueToIssueLifecycle.Issue> {

    constructor() {
        super(LifecycleActionPreferences.issue.thumps_up.id);
    }

    protected createButton(issue: graphql.IssueToIssueLifecycle.Issue,
                           repo: graphql.IssueFields.Repo,
                           context: RendererContext): Promise<Action[]> {

        const api = github.api(context.orgToken, _.get(repo, "org.provider.apiUrl"));
        return api.reactions.getForIssue({
            owner: repo.owner,
            repo: repo.name,
            number: issue.number,
            content: "+1",
        })
        .then(result =>
            [buttonForCommand(
                { text: `:+1:${result.data.length > 0 ? " " + result.data.length : ""}`, role: "react" },
                "ReactGitHubIssue",
                { issue: issue.number, repo: repo.name, owner: repo.owner, reaction: "+1" })],
        )
        .catch(() =>
                [buttonForCommand({ text: `:+1:`, role: "react" },
                    "ReactGitHubIssue",
                    { issue: issue.number, repo: repo.name, owner: repo.owner, reaction: "+1" })],
        );
    }
}

export class ReopenActionContributor extends AbstractIssueActionContributor
    implements SlackActionContributor<graphql.IssueToIssueLifecycle.Issue> {

    constructor() {
        super(LifecycleActionPreferences.issue.reopen.id);
    }

    public supports(node: any): boolean {
        return node.title && node.state === "closed";
    }

    protected createButton(issue: graphql.IssueToIssueLifecycle.Issue,
                           repo: graphql.IssueFields.Repo): Promise<Action[]> {
        return Promise.resolve([buttonForCommand({ text: "Reopen" },
            "ReopenGitHubIssue", { issue: issue.number, repo: repo.name, owner: repo.owner })]);
    }
}
