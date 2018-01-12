import { guid } from "@atomist/automation-client/internal/util/string";
import { githubToSlack } from "@atomist/slack-messages/Markdown";
import {
    Action,
    Attachment,
    emoji,
    escape,
    SlackMessage,
    url,
} from "@atomist/slack-messages/SlackMessages";
import * as _ from "lodash";
import {
    AbstractIdentifiableContribution, LifecycleConfiguration,
    NodeRenderer,
    RendererContext,
} from "../../../../lifecycle/Lifecycle";
import * as graphql from "../../../../typings/types";
import {
    avatarUrl,
    branchUrl,
    commitUrl,
    isGenerated,
    linkGitHubUsers,
    linkIssues,
    prUrl,
    repoAndlabelsAndAssigneesFooter,
    repoUrl,
    truncateCommitMessage,
    userUrl,
} from "../../../../util/helpers";
import { renderDecorator } from "../../push/rendering/PushNodeRenderers";
import { summarizeStatusCounts } from "../../push/rendering/StatusesNodeRenderer";

export class PullRequestNodeRenderer extends AbstractIdentifiableContribution
    implements NodeRenderer<graphql.PullRequestToPullRequestLifecycle.PullRequest> {

    constructor() {
        super("pull_request");
    }

    public supports(node: any): boolean {
        return node.baseBranchName;
    }

    public render(pr: graphql.PullRequestToPullRequestLifecycle.PullRequest, actions: Action[], msg: SlackMessage,
                  context: RendererContext): Promise<SlackMessage> {
        const repo = context.lifecycle.extract("repo");
        const repoSlug = `${repo.owner}/${repo.name}`;
        const state = (pr.state === "closed" ? (pr.merged === true ? "merged" : "closed") : "open");

        let color;
        let ts;
        const branchName = pr.branchName;
        const baseBranchName = pr.baseBranchName;
        const commits = pr.commits.length;
        const commitText = commits === 10 ? "commits" : (commits > 1 ? `${commits} commits` : "1 commit");

        if (state === "open") {
            msg.text = `${url(userUrl(repo, pr.author.login),
                `@${pr.author.login}`)} wants to merge ${commitText} from ${url(branchUrl(repo, branchName),
                branchName)} to ${url(branchUrl(repo, baseBranchName), baseBranchName)}`;
            color = "#6FC44C";
            ts = pr.createdAt;
        } else if (state === "closed") {
            msg.text = "Closed pull request";
            color = "#BD2C00";
            ts = pr.mergedAt;
        } else if (state === "merged") {
            msg.text = `${url(userUrl(repo, pr.merger.login),
                `@${pr.merger.login}`)} merged ${commitText} from ${url(branchUrl(repo, branchName),
                branchName)} to ${url(branchUrl(repo, baseBranchName), baseBranchName)}`;
            color = "#6E5692";
            ts = pr.mergedAt;
        }

        return linkGitHubUsers(githubToSlack(pr.body), context.context)
            .then(body => {
                const attachment: Attachment = {
                    author_name: repoSlug,
                    author_link: repoUrl(repo),
                    author_icon: `https://images.atomist.com/rug/pull-request-${state}.png`,
                    color,
                    title: `#${pr.number} ${escape(pr.title)}`,
                    title_link: prUrl(repo, pr),
                    text: pr.state !== "closed" && !isGenerated(pr) ? linkIssues(body, repo) : undefined,
                    fallback: `#${pr.number} ${escape(pr.title)}`,
                    mrkdwn_in: ["text"],
                    footer: repoAndlabelsAndAssigneesFooter(repo, pr.labels, pr.assignees),
                    ts: this.normalizeTimestamp(ts),
                    actions,
                };
                msg.attachments.push(attachment);
                return Promise.resolve(msg);
            });
    }

    private normalizeTimestamp(timestamp: string): number {
        let pd = new Date().getTime();
        try {
            const date = Date.parse(timestamp);
            if (!isNaN(date)) {
                pd = date;
            }
        } catch (e) {
            // Ignore
        }
        return Math.floor(pd / 1000);
    }
}

export class CommitNodeRenderer extends AbstractIdentifiableContribution
    implements NodeRenderer<graphql.PullRequestToPullRequestLifecycle.PullRequest> {

    public emojiStyle: "default" | "atomist";

    constructor() {
        super("commit");
    }

    public configure(configuration: LifecycleConfiguration) {
        this.emojiStyle = configuration.configuration["emoji-style"] || "default";
    }

    public supports(node: any): boolean {
        if (node.baseBranchName) {
            const pr = node as graphql.PullRequestToPullRequestLifecycle.PullRequest;
            return pr.state === "open"
                && pr.commits != null && pr.commits.length > 0;
        } else {
            return false;
        }
    }

    public render(pr: graphql.PullRequestToPullRequestLifecycle.PullRequest, actions: Action[], msg: SlackMessage,
                  context: RendererContext): Promise<SlackMessage> {
        const repo = context.lifecycle.extract("repo");
        const repoSlug = repo.owner + "/" + repo.name + "/" + pr.branchName;
        const commits = _.uniqBy(pr.commits, c => c.sha).sort((c1, c2) => c2.timestamp.localeCompare(c1.timestamp));
        const commitsGroupedByAuthor = [];

        let author = null;
        let commitsByAuthor: any = {};
        for (const commit of commits) {
            const ca = (commit.author != null ? commit.author.login : "(unknown)");
            if (author == null || author !== ca) {
                commitsByAuthor = {
                    author: ca,
                    commits: [],
                };
                author = ca;
                commitsGroupedByAuthor.push(commitsByAuthor);
            }
            if (ca === author) {
                commitsByAuthor.commits.push(commit);
            }
        }

        commitsGroupedByAuthor
            .forEach(cgba => {
                const a = cgba.author;
                let color = "#00a5ff";
                const message = cgba.commits.map(c => {
                    const [m, cl] = this.renderCommitMessage(pr, c, repo);
                    if (cl) {
                        color = cl;
                    }
                    return m;
                }).join("\n");

                const attachment: Attachment = {
                    author_name: `@${a}`,
                    author_link: userUrl(repo, a),
                    author_icon: avatarUrl(repo, a),
                    text: message,
                    mrkdwn_in: ["text"],
                    color,
                    fallback: `${cgba.commits.length} ${(cgba.commits.length > 1 ? "commits" : "commit")}` +
                    ` to ${url(repoUrl(repo), repoSlug)} by @${a}`,
                    actions,
                };
                msg.attachments.push(attachment);
            });
        return Promise.resolve(msg);
    }

    private renderCommitMessage(pr: graphql.PullRequestToPullRequestLifecycle.PullRequest,
                                c: graphql.PullRequestToPullRequestLifecycle.Commits,
                                repo: graphql.PullRequestToPullRequestLifecycle.Repo): [string, string] {

        // Cut commit to 50 chars of first line
        const cm = truncateCommitMessage(c.message, repo);
        const message = "`" + url(commitUrl(repo, c), c.sha.substring(0, 7)) + "` " + cm;

        if (c.sha === pr.head.sha && c.builds && c.builds.length > 0) {
            return  renderDecorator(c.builds[0], c.builds, message, this.emojiStyle);
        }
        return [message, null];
    }
}

export class StatusNodeRenderer extends AbstractIdentifiableContribution
    implements NodeRenderer<graphql.PullRequestToPullRequestLifecycle.PullRequest> {

    constructor() {
        super("status");
    }

    public supports(node: any): boolean {
        if (node.baseBranchName) {
            const pr = node as graphql.PullRequestToPullRequestLifecycle.PullRequest;
            return pr.state === "open"
                && pr.commits != null && pr.commits.length > 0;
        } else {
            return false;
        }
    }

    public render(pr: graphql.PullRequestToPullRequestLifecycle.PullRequest, actions: Action[], msg: SlackMessage,
                  context: RendererContext): Promise<SlackMessage> {

        const repo = context.lifecycle.extract("repo");
        const commits = pr.commits.sort((c1, c2) => c2.timestamp.localeCompare(c1.timestamp))
            .filter(c => c.statuses != null && c.statuses.length > 0);

        if (commits.length > 0 && commits[0].statuses != null) {
            const commit = commits[0];

            const pending = commit.statuses.filter(s => s.state === "pending").length;
            const success = commit.statuses.filter(s => s.state === "success").length;
            const error = commit.statuses.length - pending - success;

            const summary = summarizeStatusCounts(pending, success, error);

            // tslint:disable-next-line:variable-name
            let author_icon;
            let color;
            let message;

            if (pending > 0) {
                author_icon = `https://images.atomist.com/rug/pulsating-circle.gif?${guid()}`;
                color = "#cccc00";
                message = "Some checks haven't completed yet";
            } else if (error > 0) {
                author_icon = "https://images.atomist.com/rug/error-circle.png";
                color = "#D94649";
                message = "Some checks were not successful";
            } else {
                author_icon = "https://images.atomist.com/rug/check-circle.png";
                color = "#45B254";
                message = "All checks have passed";
            }

            const attachment: Attachment = {
                author_name: message,
                author_link: prUrl(repo, pr),
                author_icon,
                color,
                footer: summary,
                fallback: summary,
                actions,
            };
            msg.attachments.push(attachment);
        } else {
            // Provide panel for buttons
            const attachment: Attachment = {
                author_name: "No checks",
                author_link: prUrl(repo, pr),
                author_icon: "https://images.atomist.com/rug/check-circle.png",
                color: "#45B254",
                fallback: "No checks",
                actions,
            };
            msg.attachments.push(attachment);
        }
        return Promise.resolve(msg);
    }
}

export class ReviewNodeRenderer extends AbstractIdentifiableContribution
    implements NodeRenderer<graphql.PullRequestToPullRequestLifecycle.PullRequest> {

    constructor() {
        super("review");
    }

    public supports(node: any): boolean {
        if (node.baseBranchName) {
            const pr = node as graphql.PullRequestToPullRequestLifecycle.PullRequest;
            return pr.state === "open"
                && pr.reviews
                && pr.reviews.some(r => r.by.some(l => l.login !== pr.author.login));
        } else {
            return false;
        }
    }

    public render(pr: graphql.PullRequestToPullRequestLifecycle.PullRequest, actions: Action[], msg: SlackMessage,
                  context: RendererContext): Promise<SlackMessage> {
        const repo = context.lifecycle.extract("repo");

        const reviews = pr.reviews.filter(r => r.by.some(l => l.login !== pr.author.login));

        const changesRequested = reviews.filter(s => s.state === "changes_requested").length;
        const success = reviews.filter(s => s.state === "approved").length;
        const pending = reviews.length - changesRequested - success;

        let summary = this.summarizeReviewCounts(pending, success, changesRequested);
        if (pr.reviewers != null && pr.reviewers.length > 0) {
            summary += " - " + pr.reviewers.map(r =>
                `${emoji("bust_in_silhouette")} ${r.login}`).join(" ");
        }

        // tslint:disable-next-line:variable-name
        let author_icon;
        let color;
        let message;

        if (pending > 0) {
            author_icon = `https://images.atomist.com/rug/pulsating-circle.gif?${guid()}`;
            color = "#cccc00";
            message = "Some reviews are pending";
        } else if (changesRequested > 0) {
            author_icon = "https://images.atomist.com/rug/error-circle.png";
            color = "#D94649";
            message = "Some reviews requested changes";
        } else {
            author_icon = "https://images.atomist.com/rug/check-circle.png";
            color = "#45B254";
            message = "All reviews were approved";
        }

        const attachment: Attachment = {
            author_name: message,
            author_link: prUrl(repo, pr),
            author_icon,
            color,
            footer: summary,
            fallback: summary,
            actions,
        };
        msg.attachments.push(attachment);
        return Promise.resolve(msg);
    }

    private summarizeReviewCounts(pending: number, success: number, error: number): string {

        const parts = [];
        let check = "review";
        if (pending > 0) {
            parts.push(`${pending} pending`);
            if (pending > 1) {
                check = "reviews";
            }
        }
        if (error > 0) {
            parts.push(`${error} changes requested`);
            if (error > 1) {
                check = "reviews";
            } else {
                check = "review";
            }
        }
        if (success > 0) {
            parts.push(`${success} approved`);
            if (success > 1) {
                check = "reviews";
            } else {
                check = "review";
            }
        }

        // Now each one
        let footerMessage = "";
        let i;
        for (i = 0; i < parts.length; ++i) {
            if (i === 0) {
                footerMessage += parts[i];
            } else if (i === parts.length - 1) {
                footerMessage += " and " + parts[i];
            } else {
                footerMessage += ", " + parts[i];
            }
        }

        return `${footerMessage} ${check}`;
    }
}

export class BuildNodeRenderer extends AbstractIdentifiableContribution
    implements NodeRenderer<graphql.PullRequestToPullRequestLifecycle.PullRequest> {

    constructor() {
        super("build");
    }

    public supports(node: any): boolean {
        if (node.builds && node.commits) {
            const pr = node as graphql.PullRequestToPullRequestLifecycle.PullRequest;
            return pr.state === "open"
                && pr.builds != null && pr.builds.length > 0;
        } else {
            return false;
        }
    }

    public render(pr: graphql.PullRequestToPullRequestLifecycle.PullRequest, actions: Action[], msg: SlackMessage,
                  context: RendererContext): Promise<SlackMessage> {
        const build = pr.builds[0];

        let icon;
        let color;
        if (build.status === "passed") {
            icon = "https://images.atomist.com/rug/check-circle.png";
            color = "#45B254";
        } else if (build.status === "started") {
            icon = `https://images.atomist.com/rug/pulsating-circle.gif?${guid()}`;
            color = "#cccc00";
        } else {
            icon = "https://images.atomist.com/rug/cross-circle.png";
            color = "#D94649";
        }

        const attachment: Attachment = {
            author_name: `Pull Request Build #${build.name}`,
            author_link: build.buildUrl,
            author_icon: icon,
            color,
            fallback: `Pull Request Build #${build.name}`,
            actions,
        };

        msg.attachments.push(attachment);

        return Promise.resolve(msg);
    }
}
