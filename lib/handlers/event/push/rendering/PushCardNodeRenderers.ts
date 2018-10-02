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

import { logger } from "@atomist/automation-client/internal/util/logger";
import { url } from "@atomist/slack-messages";
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
    branchUrl,
    commitUrl,
    extractLinkedIssues,
    issueUrl,
    prUrl,
    repoSlug,
    tagUrl,
    truncateCommitMessage,
    userUrl,
} from "../../../../util/helpers";
import { Domain } from "../PushLifecycle";

export class PushCardNodeRenderer extends AbstractIdentifiableContribution
    implements CardNodeRenderer<graphql.PushToPushLifecycle.Push> {

    constructor() {
        super("push");
    }

    public supports(node: any): boolean {
        return node.after;
    }

    public render(push: graphql.PushToPushLifecycle.Push,
                  actions: Action[],
                  msg: CardMessage,
                  context: RendererContext): Promise<CardMessage> {
        const repo = context.lifecycle.extract("repo");
        const author = push.after && push.after.author ? push.after.author.login : "(unknown)";

        msg.title = {
            icon: "css://icon-git-commit",
            text: `${url(userUrl(repo, author),
                `@${author}`)} pushed ${push.commits.length} new ${
                (push.commits.length > 1 ? "commits" : "commit")} ` +
            `to ${url(branchUrl(repo, push.branch), `${repoSlug(repo)}/${push.branch}`)}`,
        };

        msg.shortTitle = `Push of ${push.commits.length} ${push.commits.length > 1 ?
            "commits" : "commit"} to ${url(branchUrl(repo, push.branch), push.branch)}`;

        msg.correlations.push({
            type: "repository",
            icon: "css://icon-repo",
            title: `Repository ${repo.owner}/${repo.name}/${push.branch}`,
            shortTitle: `${repo.owner}/${repo.name}/${push.branch}`,
            link: branchUrl(repo, push.branch),
        });

        msg.actions.push(...actions);

        return Promise.resolve(msg);
    }
}

export class CommitCardNodeRenderer extends AbstractIdentifiableContribution
    implements CardNodeRenderer<graphql.PushToPushLifecycle.Push> {

    constructor() {
        super("commit");
    }

    public supports(node: any): boolean {
        return node.after;
    }

    public render(push: graphql.PushToPushLifecycle.Push,
                  actions: Action[],
                  msg: CardMessage,
                  context: RendererContext): Promise<CardMessage> {
        const repo = context.lifecycle.extract("repo");
        const commits = _.uniqBy(push.commits, c => c.sha)
            .sort((c1, c2) => c2.timestamp.localeCompare(c1.timestamp));
        const author = push.after && push.after.author ?
            push.after.author.login : (push.after.email ? push.after.email.address : "(unknown)");

        msg.body = {
            avatar: avatarUrl(repo, author, push.after.author ? push.after.author.avatar : undefined),
            login: author,
            text: renderCommitMessage(push.after, repo),
            hint: (commits.length > 2
                ? `+ ${commits.length - 1 } more commits` : (commits.length === 2 ? "+ 1 more commit" : "")),
            ts: Date.parse(push.timestamp),
        };

        msg.correlations.push({
            type: "commit",
            shortTitle: commits.length.toString(),
            title: `${commits.length.toString()} ${commits.length === 1 ? "Commit" : "Commits"}`,
            icon: "css://icon-git-commit",
            body: commits.map(c => ({
                icon: avatarUrl(repo, c.author ? c.author.login : "(unknown)"),
                text: renderCommitMessage(c, repo),
            })),
        });

        /*msg.events.push(...commits.map(c => {
            const e: Event = {
                icon: avatarUrl(repo, c.author.login),
                text: renderCommitMessage(c, repo),
                ts: Date.parse(c.timestamp),
            };
            if (c.sha === push.after.sha) {
                e.actions = actions;
            }
            return e;
        }));*/

        msg.actions.push(...actions);

        return Promise.resolve(msg);
    }
}

export class BuildCardNodeRenderer extends AbstractIdentifiableContribution
    implements CardNodeRenderer<graphql.PushToPushLifecycle.Push> {

    constructor() {
        super("build");
    }

    public supports(node: any): boolean {
        return node.after && node.builds && node.builds.length > 0;
    }

    public render(push: graphql.PushToPushLifecycle.Push,
                  actions: Action[],
                  msg: CardMessage,
                  context: RendererContext): Promise<CardMessage> {

        const allBuilds = push.builds.sort((b1, b2) => b2.timestamp.localeCompare(b1.timestamp));
        const success = allBuilds.filter(b => b.status === "passed");
        const pending = allBuilds.filter(b => b.status === "started");
        const error = allBuilds.filter(b => b.status !== "passed" && b.status !== "started");

        let icon;
        if (pending.length > 0) {
            icon = "css://icon-oval-icon alert";
        } else if (error.length > 0) {
            icon = "css://icon-circle-x fail";
        } else {
            icon = "css://icon-circle-check";
        }

        msg.correlations.push({
            type: "build",
            title: `${allBuilds.length} ${allBuilds.length === 1 ? "Build" : "Builds"}`,
            shortTitle: `${success.length}/${allBuilds.length}`,
            link: allBuilds[0].buildUrl,
            icon,
            body: allBuilds.map(b => {
                let title;
                // build.name might be a number in which case we should render "Build #<number>".
                // It it isn't a number just render the build.name
                if (isNaN(+b.name)) {
                    title = b.name;
                } else {
                    title = `Build #${b.name}`;
                }
                let i;
                if (b.status === "passed") {
                    i = "css://icon-circle-check";
                } else if (b.status === "started") {
                    i = "css://icon-oval-icon alert";
                } else {
                    i = "css://icon-circle-x fail";
                }
                return {
                    icon: i,
                    text: b.buildUrl ? url(b.buildUrl, title) : title,
                };
            }),
        });

        /*msg.events.push({
           icon,
           text: `${build.buildUrl ? url(build.buildUrl, title) : title}`,
           ts: Date.parse(build.timestamp),
           actions,
        });*/

        msg.actions.push(...actions);

        return Promise.resolve(msg);
    }
}

export class TagCardNodeRenderer extends AbstractIdentifiableContribution
    implements CardNodeRenderer<graphql.PushToPushLifecycle.Push> {

    constructor() {
        super("tag");
    }

    public supports(node: any): boolean {
        return node.after && node.after.tags;
    }

    public render(push: graphql.PushToPushLifecycle.Push,
                  actions: Action[],
                  msg: CardMessage,
                  context: RendererContext): Promise<CardMessage> {
        const repo = context.lifecycle.extract("repo");

        msg.correlations.push({
            type: "tag",
            icon: "css://icon-tag",
            shortTitle: push.after.tags ? push.after.tags.length.toString() : "0",
            title: `${push.after.tags ? push.after.tags.length.toString() : "0"} ${
                push.after.tags.length === 1 ? "Tag" : "Tags"}`,
            body: push.after.tags.map(t => ({
                icon: "css://icon-tag",
                text: `${url(tagUrl(repo, t), t.name)}`,
            })),
        });

        msg.actions.push(...actions);

        /*msg.events.push(...push.after.tags.map(t => ({
            icon: "css://icon-tag",
            text: url(tagUrl(repo, t), `Tag ${t.name}`),
            ts: Date.parse(t.timestamp),
        })));

        msg.events.push(...push.after.tags.filter(t => t.release).map(t => ({
            icon: "css://icon-database",
            text: url(tagUrl(repo, t), `Release ${t.release.name}`),
            ts: Date.parse(t.release.timestamp),
        })));*/

        return Promise.resolve(msg);
    }
}

export class ApplicationCardNodeRenderer extends AbstractIdentifiableContribution
    implements CardNodeRenderer<Domain> {

    constructor() {
        super("application");
    }

    public supports(node: any): boolean {
        return node.name && node.apps;
    }

    public render(domain: Domain, actions: Action[],
                  msg: CardMessage,
                  context: RendererContext): Promise<CardMessage> {

        const running = domain.apps.filter(a => a.state === "started" || a.state === "healthy").length;
        const stopped = domain.apps.filter(a => a.state === "stopping").length;
        const unhealthy = domain.apps.filter(a => a.state === "unhealthy").map(a => a.host);

        const domainMessage = [];
        if (running > 0) {
            domainMessage.push(`${running} started`);
        }
        if (stopped > 0) {
            domainMessage.push(`${stopped} stopped`);
        }
        if (unhealthy.length > 0) {
            domainMessage.push(`${unhealthy.length} unhealthy (\`${unhealthy.join(", ")}\`)`);
        }

        msg.correlations.push({
            type: `application-${domain.name}`,
            icon: "css://icon-servers",
            title: `${domain.name.split("_").join(":")}`,
            shortTitle: `${domain.name.split("_").join(":")}`,
            body: domainMessage.map(d => ({
                text: d,
            })),
        });

        msg.actions.push(...actions);

        return Promise.resolve(msg);
    }
}

export class IssueCardNodeRenderer extends AbstractIdentifiableContribution
    implements CardNodeRenderer<graphql.PushToPushLifecycle.Push> {

    constructor() {
        super("issue");
    }

    public supports(node: any): boolean {
        return node.after;
    }

    public render(push: graphql.PushToPushLifecycle.Push,
                  actions: Action[],
                  msg: CardMessage,
                  context: RendererContext): Promise<CardMessage> {
        const repo = context.lifecycle.extract("repo");
        const message = push.commits.map(c => c.message).join("\n");

        const issues = [];
        return extractLinkedIssues(message, repo, issues, context.context)
            .then(ri => {
                let totalCount = 0;
                let closedCount = 0;

                const body = [];
                ri.issues.forEach(i => {
                    if (issues.indexOf(i.number) < 0) {
                        body.push({
                            text: `${url(issueUrl(repo, i), `#${i.number}`)}: ${truncateCommitMessage(i.title, repo)}`,
                            icon: `css://icon-issue-opened`,
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
                            text: `${url(prUrl(repo, pr), `#${pr.number}`)}: ${truncateCommitMessage(pr.title, repo)}`,
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
                        title: `${totalCount} ${totalCount === 1 ? "Issue" : "Issues"}`,
                        body,
                    });
                }

                msg.actions.push(...actions);

                return Promise.resolve(msg);
            });
    }
}

export class PullRequestCardNodeRenderer extends AbstractIdentifiableContribution
    implements CardNodeRenderer<graphql.PushToPushLifecycle.Push> {

    constructor() {
        super("pullrequest");
    }

    public supports(node: any): boolean {
        return node.branch;
    }

    public render(node: graphql.PushToPushLifecycle.Push,
                  actions: Action[],
                  msg: CardMessage,
                  context: RendererContext): Promise<CardMessage> {
        const repo = context.lifecycle.extract("repo") as graphql.PushFields.Repo;

        // Make sure we only attempt to render PR for non-default branch pushes
        if (node.branch === (repo.defaultBranch || "master")) {
            return Promise.resolve(msg);
        }

        return context.context.graphClient.query<graphql.OpenPr.Query, graphql.OpenPr.Variables>({
                name: "openPr",
                variables: {
                    repo: repo.name,
                    owner: repo.owner,
                    branch: node.branch,
                },
            })
            .then(result => {
                const pr = _.get(result, "Repo[0].branches[0].pullRequests[0]") as graphql.OpenPr.PullRequests;
                if (pr) {
                    const state = (pr.state === "closed" ? (pr.merged ? "merged" : "closed") : "open");

                    msg.correlations.push({
                       type: "pullrequest",
                       icon: `css://icon-merge`,
                       title: `PR #${pr.number}`,
                       shortTitle: `PR #${pr.number}`,
                       link: prUrl(repo, pr),
                    });

                    // store on the context
                    context.set("open_pr", `${repo.owner}/${repo.name}#${pr.number}`);
                }

                msg.actions.push(...actions);

                return msg;
            })
            .catch(err => {
                logger.error("Error occurred running GraphQL query: %s", err);
                return msg;
            });
    }
}

export function renderCommitMessage(commitNode: graphql.PushFields.Commits,
                                    repo: graphql.PushFields.Repo): string {
    // Cut commit to 50 chars of first line
    const m = truncateCommitMessage(commitNode.message, repo);
    return "`" + url(commitUrl(repo, commitNode), commitNode.sha.substring(0, 7)) + "` " + m;
}
