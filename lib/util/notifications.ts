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
    addressSlackUsers,
    HandlerContext,
} from "@atomist/automation-client";
import {
    Action,
    bold,
    githubToSlack,
    SlackMessage,
    url,
} from "@atomist/slack-messages";
import * as _ from "lodash";
import { LifecyclePreferencesName } from "../handlers/command/slack/ToggleCustomEmojiEnablement";
import { DirectMessagePreferences } from "../handlers/event/preferences";
import { renderDecorator } from "../handlers/event/push/rendering/PushNodeRenderers";
import * as graphql from "../typings/types";
import {
    AtomistGeneratedLabel,
    avatarUrl,
    commitIcon,
    commitUrl,
    getGitHubUsers,
    isAssigner,
    isDmDisabled,
    issueUrl,
    linkGitHubUsers,
    linkIssues,
    loadChatIdByGitHubId,
    prUrl,
    removeMarkers,
    repoAndChannelFooter,
    repoSlug,
    repoUrl,
    reviewUrl,
    truncateCommitMessage,
    userUrl,
} from "./helpers";

export function issueNotification(id: string,
                                  prefix: string,
                                  body: string,
                                  login: string,
                                  issue: graphql.NotifyMentionedOnIssue.Issue,
                                  repo: graphql.NotifyMentionedOnIssue.Repo,
                                  ctx: HandlerContext,
                                  actions?: Action[]): Promise<any[]> {

    // Don't send any DMs for generated comments/issues/bodies
    if (body.includes(AtomistGeneratedLabel)) {
        return Promise.resolve(null);
    }

    const matches = getGitHubUsers(body);
    return linkGitHubUsers(githubToSlack(body), ctx)
        .then(b => {
            if (matches) {
                return loadChatIdByGitHubId(ctx, _.uniq(matches))
                    .then(notifiers => {
                        return Promise.all(notifiers.map(n => {
                            if (n.login !== login
                                && !isDmDisabled(n.person.chatId, DirectMessagePreferences.mention.id)) {
                                // tslint:disable-next-line:variable-name
                                const footer_icon = `https://images.atomist.com/rug/issue-${issue.state}.png`;
                                const text = `${prefix} ${url(issueUrl(repo, issue),
                                    bold(`#${issue.number}: ${issue.title}`))}`;
                                const slackMessage: SlackMessage = {
                                    text,
                                    attachments: [
                                        {
                                            author_name: `@${login}`,
                                            author_link: userUrl(repo, login),
                                            author_icon: avatarUrl(repo, login),
                                            text: removeMarkers(linkIssues(b, repo)),
                                            mrkdwn_in: ["text"],
                                            fallback: `${prefix} #${issue.number}: ${issue.title}`,
                                            footer: repoAndChannelFooter(repo),
                                            footer_icon,
                                            ts: Math.floor(Date.now() / 1000),
                                            actions,
                                        },
                                    ],
                                };
                                const msgId =
                                    // tslint:disable-next-line:max-line-length
                                    `user_message/issue/mention/${n.person.chatId.screenName}/${repo.owner}/${repo.name}/${id}`;
                                return ctx.messageClient.send(
                                    slackMessage,
                                    addressSlackUsers(n.person.chatId.chatTeam.id, n.person.chatId.screenName),
                                    { id: msgId });
                            }
                        }));
                    });
            }
            return Promise.resolve(null);
        });
}

export function prNotification(id: string,
                               prefix: string,
                               body: string,
                               author: graphql.NotifyMentionedOnPullRequest.Author,
                               pr: graphql.NotifyMentionedOnPullRequest.PullRequest,
                               repo: graphql.NotifyMentionedOnPullRequest.Repo,
                               ctx: HandlerContext,
                               actions?: Action[]): Promise<any[]> {

    // Don't send any DMs for generated comments/issues/bodies
    if (body.includes(AtomistGeneratedLabel)) {
        return Promise.resolve(null);
    }

    const state = (pr.state === "closed" ? (pr.merged ? "merged" : "closed") : "open");

    const matches = getGitHubUsers(body);
    return linkGitHubUsers(githubToSlack(body), ctx)
        .then(b => {
            if (matches) {
                return loadChatIdByGitHubId(ctx, _.uniq(matches))
                    .then(notifiers => {
                        return Promise.all(notifiers.map(n => {
                            if (author
                                && n.login !== author.login
                                && !isDmDisabled(n.person.chatId, DirectMessagePreferences.mention.id)) {
                                // tslint:disable-next-line:variable-name
                                const footer_icon = `https://images.atomist.com/rug/pull-request-${state}.png`;
                                const text = `${prefix} ${url(prUrl(repo, pr),
                                    bold(`#${pr.number}: ${pr.title}`))}`;
                                const slackMessage: SlackMessage = {
                                    text,
                                    attachments: [
                                        {
                                            author_name: `@${author.login}`,
                                            author_link: userUrl(repo, author.login),
                                            author_icon: avatarUrl(repo, author.login),
                                            text: removeMarkers(linkIssues(b, repo)),
                                            mrkdwn_in: ["text"],
                                            fallback: `${prefix} #${pr.number}: ${pr.title}`,
                                            footer: repoAndChannelFooter(repo),
                                            footer_icon,
                                            ts: Math.floor(Date.now() / 1000),
                                            actions,
                                        },
                                    ],
                                };
                                const msgId =
                                    // tslint:disable-next-line:max-line-length
                                    `user_message/pullrequest/mention/${n.person.chatId.screenName}/${repo.owner}/${repo.name}/${id}`;
                                return ctx.messageClient.send(
                                    slackMessage,
                                    addressSlackUsers(n.person.chatId.chatTeam.id, n.person.chatId.screenName),
                                    { id: msgId });
                            }
                        }));
                    });
            }
            return Promise.resolve(null);
        });
}

export function issueAssigneeNotification(id: string,
                                          prefix: string,
                                          body: string,
                                          assignee: graphql.NotifyMentionedOnIssue.Assignees,
                                          issue: graphql.NotifyMentionedOnIssue.Issue,
                                          repo: graphql.NotifyMentionedOnIssue.Repo,
                                          ctx: HandlerContext): Promise<any> {

    return linkGitHubUsers(githubToSlack(body), ctx)
        .then(b => {
            const screenName = _.get(assignee, "person.chatId.screenName");
            if (!isAssigner(issue, assignee.login)
                && screenName
                && issue.openedBy.login !== assignee.login
                && !isDmDisabled(assignee.person.chatId, DirectMessagePreferences.assignee.id)) {
                // tslint:disable-next-line:variable-name
                const footer_icon = `https://images.atomist.com/rug/issue-${issue.state}.png`;
                const text = `${prefix} ${url(issueUrl(repo, issue),
                    bold(`#${issue.number}: ${issue.title}`))}`;
                const slackMessage: SlackMessage = {
                    text,
                    attachments: [
                        {
                            author_name: `@${issue.openedBy.login}`,
                            author_link: userUrl(repo, issue.openedBy.login),
                            author_icon: avatarUrl(repo, issue.openedBy.login),
                            text: removeMarkers(linkIssues(b, repo)),
                            mrkdwn_in: ["text"],
                            fallback: `${prefix} #${issue.number}: ${issue.title}`,
                            footer: repoAndChannelFooter(repo),
                            footer_icon,
                            ts: Math.floor(Date.now() / 1000),
                        },
                    ],
                };
                const msgId =
                    `user_message/issue/assignee/${screenName}/${repo.owner}/${repo.name}/${id}`;
                return ctx.messageClient.send(
                    slackMessage,
                    addressSlackUsers(assignee.person.chatId.chatTeam.id, screenName),
                    { id: msgId });
            }
            return Promise.resolve(null);
        });
}

export function prAssigneeNotification(id: string,
                                       prefix: string,
                                       body: string,
                                       assignee: graphql.NotifyMentionedOnPullRequest.Assignees,
                                       pr: graphql.NotifyMentionedOnPullRequest.PullRequest,
                                       repo: graphql.NotifyMentionedOnIssue.Repo,
                                       ctx: HandlerContext): Promise<any> {

    const state = (pr.state === "closed" ? (pr.merged ? "merged" : "closed") : "open");

    return linkGitHubUsers(githubToSlack(body), ctx)
        .then(b => {
            const screenName = _.get(assignee, "person.chatId.screenName");
            if (pr.author
                && !isAssigner(pr, assignee.login)
                && screenName
                && pr.author.login !== assignee.login
                && !isDmDisabled(assignee.person.chatId, DirectMessagePreferences.assignee.id)) {
                // tslint:disable-next-line:variable-name
                const footer_icon = `https://images.atomist.com/rug/pull-request-${state}.png`;
                const text = `${prefix} ${url(prUrl(repo, pr),
                    bold(`#${pr.number}: ${pr.title}`))}`;
                const slackMessage: SlackMessage = {
                    text,
                    attachments: [
                        {
                            author_name: `@${pr.author.login}`,
                            author_link: userUrl(repo, pr.author.login),
                            author_icon: avatarUrl(repo, pr.author.login),
                            text: removeMarkers(linkIssues(b, repo)),
                            mrkdwn_in: ["text"],
                            fallback: `${prefix} #${pr.number}: ${pr.title}`,
                            footer: repoAndChannelFooter(repo),
                            footer_icon,
                            ts: Math.floor(Date.now() / 1000),
                        },
                    ],
                };
                const msgId =
                    `user_message/pullrequest/assignee/${screenName}/${repo.owner}/${repo.name}/${id}`;
                return ctx.messageClient.send(
                    slackMessage,
                    addressSlackUsers(assignee.person.chatId.chatTeam.id, screenName),
                    { id: msgId });
            }
            return Promise.resolve(null);
        });
}

export function prRevieweeNotification(id: string,
                                       prefix: string,
                                       body: string,
                                       review: graphql.NotifyMentionedOnPullRequest.Reviewers,
                                       pr: graphql.NotifyMentionedOnPullRequest.PullRequest,
                                       repo: graphql.NotifyMentionedOnIssue.Repo,
                                       ctx: HandlerContext): Promise<any> {

    const state = (pr.state === "closed" ? (pr.merged ? "merged" : "closed") : "open");

    return linkGitHubUsers(githubToSlack(body), ctx)
        .then(b => {
            const login = _.get(review, "person.chatId.screenName");
            if (login
                && pr.author
                && pr.author.login !== review.login
                && !isDmDisabled(review.person.chatId, DirectMessagePreferences.reviewee.id)) {
                // tslint:disable-next-line:variable-name
                const footer_icon = `https://images.atomist.com/rug/pull-request-${state}.png`;
                const text = `${prefix} ${url(prUrl(repo, pr),
                    bold(`#${pr.number}: ${pr.title}`))}`;
                const slackMessage: SlackMessage = {
                    text,
                    attachments: [
                        {
                            author_name: `@${pr.author.login}`,
                            author_link: userUrl(repo, pr.author.login),
                            author_icon: avatarUrl(repo, pr.author.login),
                            text: removeMarkers(linkIssues(b, repo)),
                            mrkdwn_in: ["text"],
                            fallback: `${prefix} #${pr.number}: ${pr.title}`,
                            footer: repoAndChannelFooter(repo),
                            footer_icon,
                            ts: Math.floor(Date.now() / 1000),
                        },
                    ],
                };
                const msgId =
                    `user_message/pullrequest/reviewee/${login}/${repo.owner}/${repo.name}/${id}`;
                return ctx.messageClient.send(
                    slackMessage,
                    addressSlackUsers(review.person.chatId.chatTeam.id, login),
                    { id: msgId });
            }
            return Promise.resolve(null);
        });
}

export function prAuthorMergeNotification(id: string,
                                          pr: graphql.NotifyMentionedOnPullRequest.PullRequest,
                                          repo: graphql.NotifyMentionedOnPullRequest.Repo,
                                          ctx: HandlerContext): Promise<any> {

    const state = (pr.state === "closed" ? (pr.merged ? "merged" : "closed") : "open");

    const body = pr.body ? githubToSlack(pr.body) : undefined;
    return linkGitHubUsers(body, ctx)
        .then(b => {
            if (pr.author
                && _.get(pr, "author.person.chatId.screenName")
                && !isDmDisabled(pr.author.person.chatId, DirectMessagePreferences.merge.id)
                && pr.merger && pr.merger.login !== pr.author.login) {
                const login = pr.author.person.chatId.screenName;
                // tslint:disable-next-line:variable-name
                const footer_icon = `https://images.atomist.com/rug/pull-request-${state}.png`;
                const text = `${url(userUrl(repo, pr.merger.login),
                    `@${pr.merger.login}`)} ${state} your pull request ${url(prUrl(repo, pr),
                        bold(`#${pr.number}: ${pr.title}`))}`;
                const slackMessage: SlackMessage = {
                    text,
                    attachments: [
                        {
                            author_name: `@${pr.author.login}`,
                            author_link: userUrl(repo, pr.author.login),
                            author_icon: avatarUrl(repo, pr.author.login),
                            text: removeMarkers(linkIssues(b, repo)),
                            mrkdwn_in: ["text"],
                            fallback: `Pull Request #${pr.number}: ${pr.title} ${state}`,
                            footer: repoAndChannelFooter(repo),
                            footer_icon,
                            ts: Math.floor(Date.now() / 1000),
                        },
                    ],
                };
                const msgId =
                    `user_message/pullrequest/author/merge/${login}/${repo.owner}/${repo.name}/${id}`;
                return ctx.messageClient.send(
                    slackMessage,
                    addressSlackUsers(pr.author.person.chatId.chatTeam.id, login),
                    { id: msgId });
            }
            return Promise.resolve(null);
        });
}

export function prAuthorReviewNotification(id: string,
                                           review: graphql.NotifyAuthorOnReview.Review,
                                           pr: graphql.NotifyAuthorOnReview.PullRequest,
                                           repo: graphql.NotifyAuthorOnReview.Repo,
                                           ctx: HandlerContext): Promise<any> {

    const state = (pr.state === "closed" ? (pr.merged ? "merged" : "closed") : "open");

    const body = review.body ? githubToSlack(review.body) : undefined;
    return linkGitHubUsers(body, ctx)
        .then(b => {
            if (_.get(pr, "author.person.chatId.screenName")
                && !isDmDisabled(pr.author.person.chatId, DirectMessagePreferences.review.id)
                && !review.by.some(r => r.login === pr.author.login)) {
                const login = pr.author.person.chatId.screenName;
                // tslint:disable-next-line:variable-name
                const footer_icon = `https://images.atomist.com/rug/pull-request-${state}.png`;
                const text = `${url(reviewUrl(repo, pr, review), "New review")}`
                    + ` on your ${state} pull request ${url(prUrl(repo, pr),
                        bold(`#${pr.number}: ${pr.title}`))}`;
                let color;
                let title;
                if (review.state === "approved") {
                    title = "Approved";
                    color = "#37A745";
                } else if (review.state === "changes_requested") {
                    title = "Changes requested";
                    color = "#BC3D33";
                } else {
                    title = _.upperFirst(review.state);
                    // color = "#cccc00";
                }
                const slackMessage: SlackMessage = {
                    text,
                    attachments: [
                        {
                            color,
                            title,
                            title_link: reviewUrl(repo, pr, review),
                            text: removeMarkers(linkIssues(b, repo)),
                            author_name: `@${review.by[0].login}`,
                            author_icon: avatarUrl(repo, review.by[0].login),
                            author_link: userUrl(repo, review.by[0].login),
                            fallback: `New review on #${pr.number} ${pr.title}`,
                            mrkdwn_in: ["text", "pretext"],
                            footer: repoAndChannelFooter(repo),
                            footer_icon,
                            ts: Math.floor(Date.now() / 1000),
                        },
                    ],
                };
                const msgId =
                    `user_message/pullrequest/author/review/${login}/${repo.owner}/${repo.name}/${id}`;
                return ctx.messageClient.send(
                    slackMessage,
                    addressSlackUsers(pr.author.person.chatId.chatTeam.id, login),
                    { id: msgId, post: "always" });
            }
            return Promise.resolve(null);
        });
}

export function buildNotification(build: graphql.NotifyPusherOnBuild.Build,
                                  repo: graphql.NotifyPusherOnBuild.Repo,
                                  ctx: HandlerContext): Promise<any> {

    const login = _.get(build, "commit.committer.person.chatId.screenName");
    if (!login || isDmDisabled(build.commit.committer.person.chatId, DirectMessagePreferences.build.id)) {
        return Promise.resolve(null);
    }

    let emojiStyle = "default";
    const teamPreferences = _.get(build, "commit.committer.person.chatId.chatTeam.preferences") as
        graphql.NotifyPusherOnBuild.Preferences[];
    if (teamPreferences) {
        const lifecyclePreferences = teamPreferences.find(p => p.name === LifecyclePreferencesName);
        if (lifecyclePreferences) {
            const preferences = JSON.parse(lifecyclePreferences.value);
            emojiStyle = _.get(preferences, "push.configuration['emoji-style']", "default");
        }
    }

    const commit = build.commit;

    const text = "`" + url(commitUrl(repo, commit), commit.sha.substring(0, 7))
        + "` " + truncateCommitMessage(commit.message, repo);
    const [message, color] = renderDecorator(build, [build], text, emojiStyle);
    const label = build.number ? `Build #${build.number}` : build.name;

    const slackMessage: SlackMessage = {
        // tslint:disable-next-line:max-line-length
        text: `${build.buildUrl ? url(build.buildUrl, label) : label} of your commit to ${url(repoUrl(repo), repoSlug(repo))} failed`,
        attachments: [
            {
                author_name: `@${commit.committer.login}`,
                author_link: userUrl(repo, commit.committer.login),
                author_icon: avatarUrl(repo, commit.committer.login),
                text: message,
                mrkdwn_in: ["text"],
                fallback: `${label} of your commit failed`,
                color,
                footer: repoAndChannelFooter(repo),
                footer_icon: commitIcon(repo),
                ts: Math.floor(Date.now() / 1000),
            },
        ],
    };
    const msgId =
        `user_message/build/${login}/${repo.owner}/${repo.name}/${build._id}`;
    return ctx.messageClient.send(slackMessage,
        addressSlackUsers(build.commit.committer.person.chatId.chatTeam.id, login),
        { id: msgId });
}

export function reviewerNotification(push: graphql.NotifyReviewerOnPush.Push,
                                     pr: graphql.NotifyReviewerOnPush.PullRequests,
                                     repo: graphql.NotifyReviewerOnPush.Repo,
                                     review: graphql.NotifyReviewerOnPush.Reviews,
                                     ctx: HandlerContext): Promise<any> {

    const login = _.get(review, "by[0].person.chatId.screenName");
    if (!login || isDmDisabled(_.get(review, "by[0].person.chatId"), DirectMessagePreferences.prUpdates.id)) {
        return Promise.resolve(null);
    }

    const state = (pr.state === "closed" ? (pr.merged ? "merged" : "closed") : "open");
    const author = _.get(push, "commits[0].author.login");
    const count = push.commits.length;

    const body = pr.body ? githubToSlack(pr.body) : undefined;
    return linkGitHubUsers(body, ctx)
        .then(b => {
            // tslint:disable-next-line:variable-name
            const footer_icon = `https://images.atomist.com/rug/pull-request-${state}.png`;
            // tslint:disable-next-line:max-line-length
            const text = `${url(userUrl(repo, author), `@${author}`)} added ${count} new ${count > 1 ? "commits" : "commit"} to ${state} pull request ${url(prUrl(repo, pr),
                bold(`#${pr.number} ${pr.title}`))}`;
            const slackMessage: SlackMessage = {
                text,
                attachments: [
                    {
                        author_name: `@${pr.author.login}`,
                        author_link: userUrl(repo, pr.author.login),
                        author_icon: avatarUrl(repo, pr.author.login),
                        text: removeMarkers(linkIssues(b, repo)),
                        mrkdwn_in: ["text"],
                        fallback: `New commits to #${pr.number}: ${pr.title}`,
                        footer: repoAndChannelFooter(repo),
                        footer_icon,
                        ts: Math.floor(Date.now() / 1000),
                    },
                ],
            };
            const msgId =
                `user_message/pullrequest/reviewee/commits/${login}/${repo.owner}/${repo.name}/${pr.number}`;
            return ctx.messageClient.send(
                slackMessage,
                addressSlackUsers(review.by[0].person.chatId.chatTeam.id, login),
                { id: msgId });
        });
}
