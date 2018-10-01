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
    Action,
    Attachment,
    bold,
    githubToSlack,
    SlackMessage,
    url,
} from "@atomist/slack-messages";
import {
    AbstractIdentifiableContribution,
    RendererContext,
    SlackNodeRenderer,
} from "../../../../lifecycle/Lifecycle";
import * as graphql from "../../../../typings/types";
import {
    avatarUrl,
    issueUrl,
    linkGitHubUsers,
    linkIssues,
    removeMarkers,
    repoAndlabelsAndAssigneesFooter,
    userUrl,
} from "../../../../util/helpers";

export class IssueCommentNodeRenderer extends AbstractIdentifiableContribution
    implements SlackNodeRenderer<graphql.IssueToIssueCommentLifecycle.Comments> {

    constructor() {
        super("issue_comment");
    }

    public supports(node: any): boolean {
        return node.issue && node.issue.title;
    }

    public render(node: graphql.IssueToIssueCommentLifecycle.Comments, actions: Action[], msg: SlackMessage,
                  context: RendererContext): Promise<SlackMessage> {
        const repo = context.lifecycle.extract("repo");
        const issue = context.lifecycle.extract("issue");

        // tslint:disable-next-line:variable-name
        let footer_icon;
        if (issue.state === "open") {
            footer_icon = "https://images.atomist.com/rug/issue-open.png";
        } else if (issue.state === "closed") {
            footer_icon = "https://images.atomist.com/rug/issue-closed.png";
        }

        return linkGitHubUsers(githubToSlack(node.body), context.context)
            .then(body => {
                const attachment: Attachment = {
                    pretext: `New comment on ${issue.state} issue ${bold(url(issueUrl(repo, issue, node),
                        `#${issue.number}: ${issue.title}`))}`,
                    text: removeMarkers(linkIssues(body, repo)),
                    author_name: `@${node.by.login}`,
                    author_icon: avatarUrl(repo, node.by.login),
                    author_link: userUrl(repo, node.by.login),
                    fallback: `New comment on ${issue.state} issue #${issue.number}: ${issue.title}`,
                    mrkdwn_in: ["text", "pretext"],
                    footer: repoAndlabelsAndAssigneesFooter(repo, issue.labels, issue.assignees),
                    footer_icon,
                    actions,
                };
                msg.attachments.push(attachment);
                return Promise.resolve(msg);
            });
    }
}

export class PullRequestCommentNodeRenderer extends AbstractIdentifiableContribution
    implements SlackNodeRenderer<graphql.PullRequestToPullRequestCommentLifecycle.Comments> {

    constructor() {
        super("pullrequest_comment");
    }

    public supports(node: any): boolean {
        return node.pullRequest && node.pullRequest.title;
    }

    public render(node: graphql.PullRequestToPullRequestCommentLifecycle.Comments, actions: Action[], msg: SlackMessage,
                  context: RendererContext): Promise<SlackMessage> {
        const repo = context.lifecycle.extract("repo");
        const pr = context.lifecycle.extract("pullrequest");

        const state = (pr.state === "closed" ? (pr.merged === true ? "merged" : "closed") : "open");

        return linkGitHubUsers(githubToSlack(node.body), context.context)
            .then(body => {
                const attachment: Attachment = {
                    pretext: `New comment on ${state} pull request ${bold(url(issueUrl(repo, pr, node),
                        `#${pr.number}: ${pr.title}`))}`,
                    text: removeMarkers(linkIssues(body, repo)),
                    author_name: `@${node.by.login}`,
                    author_icon: avatarUrl(repo, node.by.login),
                    author_link: userUrl(repo, node.by.login),
                    fallback: `New comment on ${pr.state} pull request #${pr.number}: ${pr.title}`,
                    mrkdwn_in: ["text", "pretext"],
                    footer: repoAndlabelsAndAssigneesFooter(repo, pr.labels, pr.assignees),
                    footer_icon: `https://images.atomist.com/rug/pull-request-${state}.png`,
                    actions,
                };
                msg.attachments.push(attachment);
                return Promise.resolve(msg);
            });
    }
}
