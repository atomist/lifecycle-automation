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
    Action,
    Attachment,
    bold,
    codeLine,
    emoji as slackEmoji,
    escape,
    SlackMessage,
    url,
} from "@atomist/slack-messages";
import * as config from "config";
import * as _ from "lodash";
import {
    AbstractIdentifiableContribution,
    LifecycleConfiguration,
    RendererContext,
    SlackNodeRenderer,
} from "../../../../lifecycle/Lifecycle";
import * as graphql from "../../../../typings/types";
import { CommitIssueRelationshipBySha } from "../../../../typings/types";
import {
    avatarUrl,
    branchUrl,
    commitIcon,
    commitUrl,
    getAuthor,
    issueUrl,
    loadIssueOrPullRequest,
    prUrl,
    repoSlug,
    repoUrl,
    tagUrl,
    truncateCommitMessage,
    userUrl,
} from "../../../../util/helpers";
import { Domain } from "../PushLifecycle";
import { sortTagsByName } from "./PushActionContributors";

export const EMOJI_SCHEME = {

    default: {
        impact: {
            noChange: "\u25CE",
            info: "\u25C9",
            warning: "\u25C9",
            error: "\u25C9",
        },
        build: {
            started: "▶️",
            failed: "🛑",
            passed: "✅",
            approval: "⏸",
            preapproval: "⏸",
            requested: "⏺",
            skipped: "⏭",
            canceled: "🔼",
            stopped: "⏹",
        },
    },

    atomist: {
        impact: {
            noChange: slackEmoji("atomist_impact_no_line"),
            info: slackEmoji("atomist_impact_info_line"),
            warning: slackEmoji("atomist_impact_warning_line"),
            error: slackEmoji("atomist_impact_error_line"),
        },
        build: {
            started: slackEmoji("atomist_build_started"),
            failed: slackEmoji("atomist_build_failed"),
            passed: slackEmoji("atomist_build_passed"),
            approval: slackEmoji("atomist_build_approval"),
            preapproval: slackEmoji("atomist_build_preapproval"),
            requested: slackEmoji("atomist_build_requested"),
            skipped: slackEmoji("atomist_build_skipped"),
            canceled: slackEmoji("atomist_build_canceled"),
            stopped: slackEmoji("atomist_build_stopped"),
        },
    },
};

export class PushNodeRenderer extends AbstractIdentifiableContribution
    implements SlackNodeRenderer<graphql.PushToPushLifecycle.Push> {

    constructor() {
        super("push");
    }

    public supports(node: any): boolean {
        return node.after;
    }

    public render(push: graphql.PushToPushLifecycle.Push, actions: Action[], msg: SlackMessage,
                  context: RendererContext): Promise<SlackMessage> {
        const repo = context.lifecycle.extract("repo");

        msg.text = `${push.commits.length} new ${(push.commits.length > 1 ? "commits" : "commit")} ` +
            `to ${bold(url(branchUrl(repo, push.branch), `${repoSlug(repo)}/${push.branch}`))}`;
        msg.attachments = [];

        return Promise.resolve(msg);
    }
}

export class CommitNodeRenderer extends AbstractIdentifiableContribution
    implements SlackNodeRenderer<graphql.PushToPushLifecycle.Push> {

    public style: "fingerprint-inline" | "fingerprint-multi-line";

    public renderUnchangedFingerprints: boolean;

    public aboutHint: true;

    public emojiStyle: "default" | "atomist";

    public fingerprints: any = config.get("fingerprints.data") || {};

    constructor() {
        super("commit");
    }

    public configure(lifecyle: LifecycleConfiguration) {
        this.style = lifecyle.configuration.fingerprints.style || "fingerprint-inline";
        this.renderUnchangedFingerprints = lifecyle.configuration.fingerprints["render-unchanged"] || true;
        this.aboutHint = lifecyle.configuration.fingerprints["about-hint"] || true;
        this.emojiStyle = lifecyle.configuration["emoji-style"] || "default";
    }

    public supports(node: any): boolean {
        return node.after;
    }

    public render(push: graphql.PushToPushLifecycle.Push, actions: Action[], msg: SlackMessage,
                  context: RendererContext): Promise<SlackMessage> {
        const repo = context.lifecycle.extract("repo");
        const slug = repo.owner + "/" + repo.name + "/" + push.branch;
        const commits = _.uniqBy(push.commits, c => c.sha).sort((c1, c2) => c2.timestamp.localeCompare(c1.timestamp));

        const commitsGroupedByAuthor = [];

        let author = null;
        let commitsByAuthor: any = {};
        for (const commit of commits) {
            const ca = getAuthor(commit);

            if (author == null || author !== ca) {
                commitsByAuthor = {
                    author: ca,
                    avatar: commit.author ? commit.author.avatar : undefined,
                    commits: [],
                };
                author = ca;
                commitsGroupedByAuthor.push(commitsByAuthor);
            }
            if (ca === author) {
                commitsByAuthor.commits.push(commit);
            }
        }

        let attachments: Attachment[] = [];

        commitsGroupedByAuthor
            .forEach(cgba => {
                const a = cgba.author;

                // TODO this should use reduce here
                const message = cgba.commits.map(c => {
                    const [m, fp] = this.renderCommitMessage(c, push, repo);
                    return m;
                }).join("\n");

                const fallback = `${cgba.commits.length} ${(cgba.commits.length > 1 ? "commits" : "commit")}` +
                    ` to ${slug} by @${a}`;

                const attachment: Attachment = {
                    author_name: `@${a}`,
                    author_link: userUrl(repo, a),
                    author_icon: avatarUrl(repo, a, cgba.avatar),
                    text: message,
                    mrkdwn_in: ["text"],
                    color: "#00a5ff",
                    fallback,
                    actions: [],
                };
                attachments.push(attachment);
            });

        // Limit number of commits by author to 2
        if (attachments.length > 2) {
            attachments = attachments.slice(0, 2);
            const attachment: Attachment = {
                author_link: branchUrl(repo, push.branch),
                author_name: "Show more...",
                mrkdwn_in: ["text"],
                color: "#00a5ff",
                fallback: `Show more...`,
                actions: [],
            };
            attachments.push(attachment);
        }

        if (attachments.length > 0) {
            const lastAttachment = attachments[attachments.length - 1];
            lastAttachment.actions = actions;
            lastAttachment.footer_icon = commitIcon(repo);
            if (lastAttachment.footer != null) {
                lastAttachment.footer = `${url(repoUrl(repo), repoSlug(repo))} - ${lastAttachment.footer}`;
            } else {
                lastAttachment.footer = url(repoUrl(repo), repoSlug(repo));
            }
            lastAttachment.ts = Math.floor(Date.parse(push.timestamp) / 1000);
        }

        msg.attachments = msg.attachments.concat(attachments);

        return Promise.resolve(msg);
    }

    private renderCommitMessage(commitNode: graphql.PushFields.Commits, push: any,
                                repo: any): [string, boolean] {
        // Cut commit to 50 chars of first line
        let m = truncateCommitMessage(commitNode.message, repo);
        let foundFingerprints = false;
        // Verify that fingerprints aren't displayed for the first commit after the "initial commit"
        if ((push.before != null && push.before.message !== "Initial commit" || push.before == null)
            && (commitNode as any).impact != null) {

            const impact = (commitNode as any).impact;
            // [[["plugins",0],["rest",1],["deps",0]]]
            const data = JSON.parse(impact.data);

            if (data != null) {
                if (this.style === "fingerprint-multi-line") {
                    const changedFingerprints: string[] = [];
                    data.forEach(i => i.filter(f => f[1] > 0).forEach(f => {
                        if (changedFingerprints.indexOf(f[0]) < 0) {
                            m = `${m}${this.renderFingerprintMessageMultiLine(f[0], impact)}`;
                            foundFingerprints = true;
                        }
                    }));
                } else if (this.style === "fingerprint-inline") {
                    const fm = [];
                    data.filter(i => i.filter(f => f[1] > 0).length > 0).forEach(i => {
                        const fpv = [];
                        // Filter the relevant fingerprints and map to their group names
                        i.filter(f => this.renderUnchangedFingerprints
                            || (!this.renderUnchangedFingerprints && f[1] === 1))
                            .map(f => [this.getGroup(f[0]), f[1]]).forEach(f => {
                            const fpvf = fpv.filter(fp => fp[0] === f[0]);
                            if (fpvf.length > 0) {
                                fpvf.forEach(fp => fp[1] += f[1]);
                            } else {
                                fpv.push(f);
                            }
                        });

                        const max = fpv.reduce((a, b) => (a[0].length > b[0].length ? a : b))[0].length;
                        fpv.sort((f1, f2) => f1[0].localeCompare(f2[0])).forEach(f => {
                            // tslint:disable-next-line:max-line-length
                            fm.push(`${(f[1] > 0 ? EMOJI_SCHEME[this.emojiStyle].impact[this.getFingerprintLevel(f[0])]
                                : EMOJI_SCHEME[this.emojiStyle].impact.noChange)} ${this.pad(max, f[0], " ")}`);
                        });
                    });

                    // box drawing light vertical: \u2502
                    // box drawings light up and right: \u2514
                    // box drawings light vertical and right: \u251c
                    if (fm.length > 6) {
                        const groups = this.groups(fm, 5);
                        for (let i = 0; i < groups.length; i++) {
                            if (i < groups.length - 1) {
                                m += "\n\u251c " + groups[i].join(" \t ");
                            } else {
                                m += "\n\u2514 " + groups[i].join(" \t ");
                            }
                        }
                    } else if (fm.length > 0) {
                        m += "\n\u2514 " + fm.join(" \t ");
                    }

                    if (fm.length > 0) {
                        foundFingerprints = true;
                    }
                }
            }
        }
        return ["`" + url(commitUrl(repo, commitNode), commitNode.sha.substring(0, 7)) + "` " + m, foundFingerprints];
    }

    private renderFingerprintMessageMultiLine(fingerprint: string, impact: graphql.PushFields.Impact): string {
        return `\n┗ ${EMOJI_SCHEME[this.emojiStyle].impact[this.getFingerprintLevel(fingerprint)]}`
            + ` ${this.getFingerprintDescription(fingerprint)} ${url(impact.url, "more...")}`;
    }

    private getFingerprintDescription(fingerprint: string): string {
        if (this.fingerprints[fingerprint] != null) {
            return this.fingerprints[fingerprint].description;
        } else {
            return `Fingerprint ${fingerprint} changed`;
        }
    }

    private getFingerprintLevel(fingerprint: string): string {
        if (this.fingerprints[fingerprint] != null) {
            return this.fingerprints[fingerprint].level;
        } else {
            return "warning";
        }
    }

    private getGroup(fingerprint: string): string {
        if (this.fingerprints[fingerprint] != null && this.fingerprints[fingerprint].group != null) {
            return this.fingerprints[fingerprint].group;
        } else {
            return fingerprint;
        }
    }

    private groups(msgs: string[], size: number = 5) {
        const sets = [];
        const chunks = msgs.length / size;
        for (let i = 0, j = 0; i < chunks; i++ , j += size) {
            sets[i] = msgs.slice(j, j + size);
        }
        return sets;
    }

    private pad(width: number, str: string, padding: string) {
        return (width <= str.length) ? str : this.pad(width, str + padding, padding);
    }
}

export class BuildNodeRenderer extends AbstractIdentifiableContribution
    implements SlackNodeRenderer<graphql.PushFields.Builds> {

    public emojiStyle: "default" | "atomist";

    constructor() {
        super("build");
    }

    public configure(configuration: LifecycleConfiguration) {
        this.emojiStyle = configuration.configuration["emoji-style"] || "default";
    }

    public supports(node: any): boolean {
        return node.status;
    }

    public render(build: graphql.PushFields.Builds, actions: Action[], msg: SlackMessage,
                  context: RendererContext): Promise<SlackMessage> {
        const push = context.lifecycle.extract("push");
        const attachment = msg.attachments[0];
        const [message, color] = renderDecorator(build, push.builds, attachment.text, this.emojiStyle);
        attachment.color = color;
        attachment.text = message;
        if (attachment.actions != null) {
            attachment.actions = attachment.actions.concat(actions);
        } else {
            attachment.actions = actions;
        }
        return Promise.resolve(msg);
    }
}

export function renderDecorator(build: graphql.PushFields.Builds,
                                builds: graphql.PushFields.Builds[],
                                message: string, emojiStyle: string): [string, string] {
    // For now we only render the last build as decorator
    builds = builds.sort((b1, b2) => b2.timestamp.localeCompare(b1.timestamp));
    if (builds[0].buildId !== build.buildId) {
        return [message, "#00a5ff"];
    }

    let color;
    let emoji;
    if (build.status === "passed") {
        color = "#45B254";
        emoji = EMOJI_SCHEME[emojiStyle].build.passed;
    } else if (build.status === "started") {
        color = "#cccc00";
        emoji = EMOJI_SCHEME[emojiStyle].build.started;
    } else if (build.status === "canceled") {
        color = "#45B254";
        emoji = EMOJI_SCHEME[emojiStyle].build.skipped;
    } else {
        color = "#D94649";
        emoji = EMOJI_SCHEME[emojiStyle].build.failed;
    }

    if (message) {
        const messages = (message || "").split(("\n"));

        let title;
        // build.name might be a number in which case we should render "Build #<number>".
        // It it isn't a number just render the build.name
        if (isNaN(+build.name)) {
            title = build.name;
        } else {
            title = `Build #${build.name}`;
        }

        if (build.buildUrl) {
            messages[0] = `${messages[0]} ${emoji} ${url(build.buildUrl, title)}`;
        } else {
            messages[0] = `${messages[0]} ${emoji} ${title}`;
        }
        message = messages.join("\n");

        if (emojiStyle === "default") {
            // Colorize the push to indicate something might be wrong for builds
            return [message, color];
        } else {
            return [message, "#00a5ff"];
        }
    }
    return [message, "#00a5ff"];
}

export class TagNodeRenderer extends AbstractIdentifiableContribution
    implements SlackNodeRenderer<graphql.PushFields.Tags> {

    public emojiStyle: "default" | "atomist";

    constructor() {
        super("tag");
    }

    public configure(configuration: LifecycleConfiguration) {
        this.emojiStyle = configuration.configuration["emoji-style"] || "default";
    }

    public supports(node: any): boolean {
        return "release" in node;
    }

    public render(tag: graphql.PushFields.Tags, actions: Action[], msg: SlackMessage,
                  context: RendererContext): Promise<SlackMessage> {
        const repo = context.lifecycle.extract("repo");
        const push = context.lifecycle.extract("push");

        const first = sortTagsByName(push.after.tags)
            .indexOf(tag) === 0;

        let message = url(tagUrl(repo, tag), codeLine(tag.name));
        let color;
        if (tag.builds && tag.builds.length > 0) {
            const builds = tag.builds.sort((b1, b2) => b2.timestamp.localeCompare(b1.timestamp));
            const [newMessage, newColor] = renderDecorator(builds[0], builds, message, this.emojiStyle);
            message = newMessage;
            color = newColor;
        }
        // Add the release to the message
        if (tag.release) {
            if (tag.release.name !== tag.name) {
                message = `${message} | ${url(tagUrl(repo, tag), `Release ${codeLine(tag.release.name)}`)}`;
            } else {
                message = `${message} | ${url(tagUrl(repo, tag), "Release")}`;
            }
        }

        const attachment: Attachment = {
            author_name: first ? (push.after.tags.length > 1 ? "Tags" : "Tag") : undefined,
            author_icon: first ? `https://images.atomist.com/rug/tag-outline.png` : undefined,
            fallback: first ? push.after.tags.length > 1 ? "Tags" : "Tag" : undefined,
            text: message,
            mrkdwn_in: ["text"],
            color,
            actions,
        };
        msg.attachments.push(attachment);
        return Promise.resolve(msg);
    }
}

export class ApplicationNodeRenderer extends AbstractIdentifiableContribution
    implements SlackNodeRenderer<Domain> {

    constructor() {
        super("application");
    }

    public supports(node: any): boolean {
        return node.name && node.apps;
    }

    public render(domain: Domain, actions: Action[], msg: SlackMessage,
                  context: RendererContext): Promise<SlackMessage> {

        const domains = context.lifecycle.extract("domains") as Domain[];
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

        const ix = domains.indexOf(domains.find(d => d.name === domain.name));

        // sort the domains by name and render an attachment per domain
        const attachment: Attachment = {
            text: `${codeLine(domain.name.split("_").join(":"))} ${domainMessage.join(", ")}`,
            author_name: ix === 0 ? "Services" : undefined,
            author_icon: ix === 0 ? `https://images.atomist.com/rug/tasks.png` : undefined,
            fallback: `${domain.name.split("_").join(":")} ${domainMessage.join(", ")}`,
            // color: "#767676",
            mrkdwn_in: ["text"],
            actions,
        };
        msg.attachments.push(attachment);

        return Promise.resolve(msg);
    }
}

interface Environment {
    name: string;
    running: number;
    waiting: number;
    terminated: number;
}

export class K8PodNodeRenderer extends AbstractIdentifiableContribution
    implements SlackNodeRenderer<graphql.K8PodToPushLifecycle.Pushes> {

    constructor() {
        super("k8pod");
    }

    public supports(node: any): boolean {
        return node.after && node.after.images && node.after.images.length > 0;
    }

    public render(push: graphql.K8PodToPushLifecycle.Pushes, actions: Action[],
                  msg: SlackMessage, context: RendererContext): Promise<SlackMessage> {
        const images = push.after.images;
        let isInitialEnv = true;
        images.forEach(image => {
            const pods = image.pods;
            const envs: Environment[] = [];
            if (_.isEmpty(pods)) {
                return;
            }
            pods.forEach(pod => {
                let env = envs.find(e => e.name
                    === `${pod.environment}${pod.namespace ? ":" + pod.namespace : ""}`);
                if (_.isUndefined(env)) {
                    env = {
                        name: `${pod.environment}${pod.namespace ? ":" + pod.namespace : ""}`,
                        running: 0,
                        waiting: 0,
                        terminated: 0,
                    };
                    envs.push(env);
                }
                pod.containers.forEach(c => {
                    if (c.state === "running") {
                        env.running++;
                    } else if (c.state === "waiting") {
                        env.waiting++;
                    } else if (c.state === "terminated") {
                        env.terminated++;
                    }
                });
            });
            envs.sort((e1, e2) => e1.name.localeCompare(e2.name)).forEach(e => {
                const terminatedCountMsg = e.terminated > 0 ? ", " + e.terminated + " terminated" : "";
                const waitingCountMsg = e.waiting > 0 ? ", " + e.waiting + " waiting" : "";
                const stateOfContainers = `${e.running} running${waitingCountMsg}${terminatedCountMsg}`;
                const attachment: Attachment = {
                    text: escape(`\`${e.name}\` ${stateOfContainers}`),
                    fallback: escape(`${e.name} - ${stateOfContainers}`),
                    mrkdwn_in: ["text"],
                    footer: image.imageName,
                    actions,
                };
                if (isInitialEnv) {
                    isInitialEnv = false;
                    attachment.author_name = `Containers`;
                    attachment.author_icon = `https://images.atomist.com/rug/kubes.png`;
                }
                msg.attachments.push(attachment);
            });
        });
        return Promise.resolve(msg);
    }
}

export class IssueNodeRenderer extends AbstractIdentifiableContribution
    implements SlackNodeRenderer<graphql.PushToPushLifecycle.Push> {

    constructor() {
        super("issue");
    }

    public supports(node: any): boolean {
        return node.after
            && node.commits.some(c => c.resolves != null && c.resolves.length > 0);
    }

    public async render(push: graphql.PushToPushLifecycle.Push,
                        actions: Action[],
                        msg: SlackMessage,
                        context: RendererContext): Promise<SlackMessage> {
        const repo = context.lifecycle.extract("repo");
        const issues = [];

        // Process directly connected issues
        push.commits.filter(c => c.resolves != null).forEach(c => c.resolves.forEach(i => {
            const key = `${repo.owner}/${repo.name}#${i.number}`;
            if (issues.indexOf(key) < 0 && i.title && i.state) {
                // tslint:disable-next-line:variable-name
                const author_name = `#${i.number}: ${truncateCommitMessage(i.title, repo)}`;
                const attachment: Attachment = {
                    author_name,
                    author_icon: `https://images.atomist.com/rug/issue-${i.state}.png`,
                    author_link: issueUrl(repo, i),
                    fallback: author_name,
                };
                msg.attachments.push(attachment);
                issues.push(key);
            }
        }));

        // Load commit->issue relationships
        const result = await context.context.graphClient.query<
            CommitIssueRelationshipBySha.Query, CommitIssueRelationshipBySha.Variables>({
            name: "commitIssueRelationshipBySha",
            variables: {
                owner: [push.repo.owner],
                repo: [push.repo.name],
                sha: [push.after.sha],
            },
        });
        for (const issueRel of result.CommitIssueRelationship) {
            const key = `${repo.owner}/${repo.name}#${issueRel.issue.name}`;
            if (issues.indexOf(key) < 0) {
                const i = _.get(
                    await loadIssueOrPullRequest(
                        push.repo.owner,
                        push.repo.name,
                        [issueRel.issue.name],
                        context.context),
                    "issue.repo[0].issue[0]");
                if (i) {
                    // tslint:disable-next-line:variable-name
                    const author_name = `#${i.number}: ${truncateCommitMessage(i.title, repo)}`;
                    const attachment: Attachment = {
                        author_name,
                        author_icon: `https://images.atomist.com/rug/issue-${i.state}.png`,
                        author_link: issueUrl(repo, i),
                        fallback: author_name,
                    };
                    msg.attachments.push(attachment);
                    issues.push(key);
                }
            }
        }

        context.set("issues", issues);
        return Promise.resolve(msg);
    }
}

export class PullRequestNodeRenderer extends AbstractIdentifiableContribution
    implements SlackNodeRenderer<graphql.PushToPushLifecycle.Push> {

    constructor() {
        super("pullrequest");
    }

    public supports(node: any): boolean {
        return node.branch;
    }

    public render(node: graphql.PushToPushLifecycle.Push, actions: Action[],
                  msg: SlackMessage, context: RendererContext): Promise<SlackMessage> {
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
                    // tslint:disable-next-line:variable-name
                    const author_name = `#${pr.number}: ${truncateCommitMessage(pr.title, repo)}`;
                    const attachment: Attachment = {
                        author_name,
                        author_icon: `https://images.atomist.com/rug/pull-request-${state}.png`,
                        author_link: prUrl(repo, pr),
                        fallback: author_name,
                    };
                    msg.attachments.push(attachment);

                    // store on the context
                    context.set("open_pr", `${repo.owner}/${repo.name}#${pr.number}`);
                }
                return msg;
            })
            .catch(err => {
                logger.error("Error occurred running GraphQL query: %s", err);
                return msg;
            });
    }
}

export class BlackDuckFingerprintNodeRenderer extends AbstractIdentifiableContribution
    implements SlackNodeRenderer<graphql.PushToPushLifecycle.Push> {

    constructor() {
        super("blackduck");
    }

    public supports(node: any): boolean {
        return node.after && node.after.fingerprints && node.after.fingerprints.length > 0;
    }

    public render(push: graphql.PushToPushLifecycle.Push, actions: Action[], msg: SlackMessage,
                  context: RendererContext): Promise<SlackMessage> {
        const riskProfileFingerprint = push.after.fingerprints.find(f => f.name === "BlackDuckRiskProfile");
        if (riskProfileFingerprint) {
            const riskProfile = JSON.parse(riskProfileFingerprint.data);
            const v = riskProfile.categories.VULNERABILITY;
            const rpMsg = `Security Risks - ${v.HIGH} High, ${v.MEDIUM} Medium, ${v.LOW} Low`;
            const attachment: Attachment = {
                author_name: `Black Duck`,
                author_icon: `https://images.atomist.com/rug/blackduck.jpg`,
                text: escape(rpMsg),
                fallback: escape(rpMsg),
                mrkdwn_in: ["text"],
                actions,
            };
            const blackDuckStatus = push.after.statuses.find(s => s.context === "black-duck/hub-detect");
            if (blackDuckStatus) {
                const refUrl = riskProfile._meta.href;
                const matches = refUrl.match(/\/versions\/(.*)\/risk-profile/);
                const versionId = matches[1];
                const bdLink = `${blackDuckStatus.targetUrl}/ui/versions/id:${versionId}/view:bom`;
                attachment.author_link = bdLink;
            }
            msg.attachments.push(attachment);
        }
        return Promise.resolve(msg);
    }
}
