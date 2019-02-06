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

import { logger } from "@atomist/automation-client";
import {
    githubToSlack,
    url,
} from "@atomist/slack-messages";
import * as _ from "lodash";
import {
    Action,
    addCollaborator,
    CardMessage,
} from "../../../../lifecycle/card";
import {
    AbstractIdentifiableContribution,
    CardNodeRenderer,
    RendererContext,
} from "../../../../lifecycle/Lifecycle";
import * as graphql from "../../../../typings/types";
import {
    avatarUrl,
    extractLinkedIssues,
    issueUrl,
    linkGitHubUsers,
    linkIssues,
    repoUrl,
    truncateCommitMessage,
    userUrl,
} from "../../../../util/helpers";
import * as github from "../../../command/github/gitHubApi";
import { renderCommitMessage } from "../../push/rendering/PushCardNodeRenderers";

export class IssueCardNodeRenderer extends AbstractIdentifiableContribution
    implements CardNodeRenderer<graphql.IssueToIssueLifecycle.Issue> {

    constructor() {
        super("issue");
    }

    public supports(node: any): boolean {
        return node.title;
    }

    public render(node: graphql.IssueToIssueLifecycle.Issue,
                  actions: Action[],
                  msg: CardMessage,
                  context: RendererContext): Promise<CardMessage> {
        const repo = context.lifecycle.extract("repo") as graphql.IssueFields.Repo;

        const comment = context.lifecycle.extract("comment");
        if (comment) {
            msg.actions.push(...actions);
            return Promise.resolve(msg);
        }

        let title = `${url(issueUrl(repo, node), `#${node.number.toString()}: ${node.title}`)}`;
        let icon;
        if (node.state === "open") {
            icon = "css://icon-issue-opened";
            if (node.createdAt === node.updatedAt) {
                title = `${url(userUrl(repo, node.openedBy.login),
                    `@${node.openedBy.login}`)} created issue ${title}`;
            } else {
                icon = "css://icon-issue-reopened";
                title = `Updated issue ${title}`;
            }
        } else if (node.state === "closed") {
            icon = "css://icon-issue-closed";
            if (node.closedAt === node.updatedAt) {
                if (node.closedBy != null && node.closedBy.login != null) {
                    title = `${url(userUrl(repo, node.closedBy.login),
                        `@${node.closedBy.login}`)} closed issue ${title}`;
                } else {
                    title = `Closed issue ${title}`;
                }
            } else {
                title = `Updated issue ${title}`;
            }
        }

        return linkGitHubUsers(githubToSlack(node.body), context.context)
            .then(body => {

                msg.title = {
                    icon,
                    text: title,
                };

                msg.shortTitle = `Issue ${url(issueUrl(repo, node), `#${node.number}: ${node.title}`)}`;

                msg.body = {
                    avatar: avatarUrl(repo, node.openedBy.login),
                    login: node.openedBy.login,
                    text: linkIssues(body, repo),
                    ts: Date.parse(node.createdAt),
                };

                msg.actions.push(...actions);

                return msg;
            })
            .then(card => {
                const api = github.api(context.orgToken, _.get(repo, "org.provider.apiUrl"));
                return api.reactions.getForIssue({
                    owner: repo.owner,
                    repo: repo.name,
                    number: node.number,
                    content: "+1",
                })
                    .then(result => {
                        card.reactions = (result.data || []).map(r => ({
                            avatar: r.user.avatar_url,
                            login: r.user.login,
                            reaction: "+1",
                        }));

                        (result.data || []).forEach(c => addCollaborator(
                            {
                                login: c.user.login,
                                avatar: c.user.avatar_url,
                                link: c.user.html_url,
                            }, card));

                        return card;
                    })
                    .catch(err => msg);
            })
            .then(card => {
                const api = github.api(context.orgToken, _.get(repo, "org.provider.apiUrl"));
                return api.issues.getComments({
                    owner: repo.owner,
                    repo: repo.name,
                    number: node.number,
                })
                    .then(result => {
                        card.comments = (result.data || []).map(c => ({
                            avatar: c.user.avatar_url,
                            login: c.user.login,
                            text: c.body,
                        }));

                        (result.data || []).forEach(c => addCollaborator(
                            {
                                login: c.user.login,
                                avatar: c.user.avatar_url,
                                link: c.user.html_url,
                            }, card));

                        return card;
                    })
                    .catch(err => msg);
            })
            .catch(() => msg);
    }
}

export class CommentCardNodeRenderer extends AbstractIdentifiableContribution
    implements CardNodeRenderer<graphql.CommentToIssueLifecycle.Comment> {

    constructor() {
        super("issue");
    }

    public supports(node: any): boolean {
        return node.issue;
    }

    public render(node: graphql.CommentToIssueLifecycle.Comment,
                  actions: Action[],
                  msg: CardMessage,
                  context: RendererContext): Promise<CardMessage> {
        const repo = context.lifecycle.extract("repo") as graphql.IssueFields.Repo;
        const issue = node.issue;

        let title = `${url(issueUrl(repo, issue, node), `#${issue.number.toString()}: ${issue.title}`)}`;
        title = `${url(avatarUrl(repo, node.by.login), `@${node.by.login}`)} commented on ${title}`;

        let icon;
        if (issue.state === "open") {
            icon = "css://icon-issue-opened";
        } else if (issue.state === "closed") {
            icon = "css://icon-issue-closed";
        }

        return linkGitHubUsers(githubToSlack(node.body), context.context)
            .then(body => {

                msg.title = {
                    icon,
                    text: title,
                };

                msg.shortTitle = `Issue ${url(issueUrl(repo, node), `#${issue.number}: ${issue.title}`)}`;

                msg.body = {
                    avatar: avatarUrl(repo, node.by.login),
                    login: node.by.login,
                    text: linkIssues(body, repo),
                    ts: Date.parse(node.timestamp),
                };

                msg.actions.push(...actions);

                return msg;
            })
            .then(card => {
                const api = github.api(context.orgToken, _.get(repo, "org.provider.apiUrl"));
                return api.reactions.getForIssue({
                    owner: repo.owner,
                    repo: repo.name,
                    number: issue.number,
                    content: "+1",
                })
                    .then(result => {
                        card.reactions = (result.data || []).map(r => ({
                            avatar: r.user.avatar_url,
                            login: r.user.login,
                            reaction: "+1",
                        }));

                        (result.data || []).forEach(c => addCollaborator(
                            {
                                login: c.user.login,
                                avatar: c.user.avatar_url,
                                link: c.user.html_url,
                            }, card));

                        return card;
                    })
                    .catch(err => {
                        logger.warn(err);
                        return msg;
                    });
            })
            .then(card => {
                const api = github.api(context.orgToken, _.get(repo, "org.provider.apiUrl"));
                return api.issues.getComments({
                    owner: repo.owner,
                    repo: repo.name,
                    number: issue.number,
                })
                    .then(result => {
                        card.comments = (result.data || []).map(c => ({
                            avatar: c.user.avatar_url,
                            login: c.user.login,
                            text: c.body,
                        }));

                        (result.data || []).forEach(c => addCollaborator(
                            {
                                login: c.user.login,
                                avatar: c.user.avatar_url,
                                link: c.user.html_url,
                            }, card));

                        return card;
                    })
                    .catch(err => {
                        logger.warn(err);
                        return msg;
                    });
            })
            .catch(() => msg);
    }
}

export class CorrelationsCardNodeRenderer extends AbstractIdentifiableContribution
    implements CardNodeRenderer<graphql.IssueToIssueLifecycle.Issue> {

    constructor() {
        super("issue");
    }

    public supports(node: any): boolean {
        return node.title;
    }

    public async render(issue: graphql.IssueToIssueLifecycle.Issue,
                        actions: Action[],
                        msg: CardMessage,
                        context: RendererContext): Promise<CardMessage> {
        const repo = context.lifecycle.extract("repo");

        msg.comments = [];
        msg.reactions = [];

        msg.correlations.push({
            type: "repository",
            icon: "css://icon-repo",
            title: `Repository ${repo.owner}/${repo.name}`,
            shortTitle: `${repo.owner}/${repo.name}`,
            link: repoUrl(repo),
        });

        const len = issue.resolvingCommits ? issue.resolvingCommits.length : 0;

        msg.correlations.push({
            type: "commit",
            icon: "css://icon-git-commit",
            shortTitle: issue.resolvingCommits ? issue.resolvingCommits.length.toString() : "0",
            title: `${len} ${len === 1 ? "Commit" : "Commits"}`,
            body: issue.resolvingCommits ? issue.resolvingCommits.map(c => ({
                icon: c.author ? avatarUrl(repo, c.author.login) : undefined,
                text: renderCommitMessage(c, repo),
            })) : undefined,
        });

        msg.correlations.push({
            type: "label",
            icon: "css://icon-tag",
            title: `${issue.labels.length} ${issue.labels.length === 1 ? "Label" : "Labels"}`,
            shortTitle: issue.labels.length === 0 ? "0" :
                (issue.labels.length <= 2 ? issue.labels.map(l => l.name).join(", ") : issue.labels.length.toString()),
            body: issue.labels.map(l => ({
                icon: "css://far fa-tag",
                text: l.name,
            })),
        });

        try {
            const api = github.api(context.orgToken);
            const result = await api.issues.getEventsTimeline({
                owner: repo.owner,
                repo: repo.name,
                issue_number: issue.number,
            });
            result.data.forEach(e => {
                switch (e.event) {
                    case "assigned":
                        msg.events.push({
                            icon: e.actor.avatar_url,
                            text: e.actor.login === e.assignee.login ?
                                `@${e.assignee.login} self-assigned` :
                                `@${e.actor.login} assigned @${e.assignee.login}`,
                            ts: Date.parse(e.created_at),
                        });
                        break;
                    case "commented": {
                        msg.events.push({
                            icon: e.actor.avatar_url,
                            text: `@${e.actor.login} ${url(e.html_url, "commented")}`,
                            ts: Date.parse(e.created_at),
                        });
                        break;
                    }
                    case "labeled": {
                        msg.events.push({
                            icon: e.actor.avatar_url,
                            text: `@${e.actor.login} added ${e.label.name} label`,
                            ts: Date.parse(e.created_at),
                        });
                        break;
                    }
                    case "unlabeled": {
                        msg.events.push({
                            icon: e.actor.avatar_url,
                            text: `@${e.actor.login} removed ${e.label.name} label`,
                            ts: Date.parse(e.created_at),
                        });
                        break;
                    }
                    case "renamed": {
                        msg.events.push({
                            icon: e.actor.avatar_url,
                            text: `@${e.actor.login} change title`,
                            ts: Date.parse(e.created_at),
                        });
                        break;
                    }
                    case "closed": {
                        msg.events.push({
                            icon: e.actor.avatar_url,
                            text: `@${e.actor.login} closed issue`,
                            ts: Date.parse(e.created_at),
                        });
                        break;
                    }
                    case "reopened": {
                        msg.events.push({
                            icon: e.actor.avatar_url,
                            text: `@${e.actor.login} reopened issue`,
                            ts: Date.parse(e.created_at),
                        });
                        break;
                    }
                }
            });
        } catch (e) {
            // intentionally left empty
        }
        return msg;
    }
}

export class ReferencedIssueCardNodeRenderer extends AbstractIdentifiableContribution
    implements CardNodeRenderer<graphql.IssueToIssueLifecycle.Issue> {

    constructor() {
        super("referencedissue");
    }

    public supports(node: any): boolean {
        return node.title;
    }

    public render(issue: graphql.IssueToIssueLifecycle.Issue,
                  actions: Action[],
                  msg: CardMessage,
                  context: RendererContext): Promise<CardMessage> {
        const repo = context.lifecycle.extract("repo");
        const message = `${issue.title} ${issue.body} ${(issue.comments || []).map(c => c.body).join("\n")}`;

        const issues = [];
        return extractLinkedIssues(message, repo, issues, context.context)
            .then(ri => {
                let totalCount = 0;
                let closedCount = 0;

                const body = [];
                ri.issues.forEach(i => {
                    if (issues.indexOf(i.number) < 0) {
                        body.push({
                            text: `#${i.number}: ${truncateCommitMessage(i.title, repo)}`,
                            icon: i.state === "open" ? "css://icon-issue-opened" : "css://icon-issue-closed",
                        });
                        totalCount++;
                        if (i.state === "closed") {
                            closedCount++;
                        }
                        issues.push(i.number);
                        addCollaborator(
                            {
                                avatar: avatarUrl(repo, i.openedBy.login),
                                link: userUrl(repo, i.openedBy.login),
                                login: i.openedBy.login,
                            },
                            msg);
                    }
                });
                ri.prs.forEach(pr => {
                    if (issues.indexOf(pr.number) < 0) {
                        const state = (pr.state === "closed" ? (pr.merged ? "merged" : "closed") : "open");
                        body.push({
                            text: `#${pr.number}: ${truncateCommitMessage(pr.title, repo)}`,
                            icon: `css://icon-merge`,
                        });
                        totalCount++;
                        if (pr.state === "closed") {
                            closedCount++;
                        }
                        issues.push(pr.number);
                        addCollaborator(
                            {
                                avatar: avatarUrl(repo, pr.author.login),
                                link: userUrl(repo, pr.author.login),
                                login: pr.author.login,
                            },
                            msg);
                    }
                });

                if (totalCount > 0) {
                    msg.correlations.push({
                        type: "issue",
                        icon: "css://icon-issue-opened",
                        shortTitle: `${closedCount}/${totalCount}`,
                        title: `${totalCount} Issue`,
                        body,
                    });
                }
                return Promise.resolve(msg);
            });
    }
}
