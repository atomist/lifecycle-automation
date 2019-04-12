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
    Action,
    Attachment,
    bold,
    githubToSlack,
    SlackMessage,
    url,
} from "@atomist/slack-messages";
import * as _ from "lodash";
import {
    AbstractIdentifiableContribution,
    RendererContext,
    SlackNodeRenderer,
} from "../../../../lifecycle/Lifecycle";
import * as graphql from "../../../../typings/types";
import {
    avatarUrl,
    linkGitHubUsers,
    linkIssues,
    prUrl,
    repoAndlabelsAndAssigneesFooter,
    reviewUrl,
    userUrl,
} from "../../../../util/helpers";

export class ReviewNodeRenderer extends AbstractIdentifiableContribution
    implements SlackNodeRenderer<graphql.ReviewToReviewLifecycle.Review> {

    constructor() {
        super("review");
    }

    public supports(node: any): boolean {
        return node.pullRequest;
    }

    public render(review: graphql.ReviewToReviewLifecycle.Review, actions: Action[], msg: SlackMessage,
                  context: RendererContext): Promise<SlackMessage> {
        const repo = context.lifecycle.extract("repo");
        const pr = context.lifecycle.extract("pullrequest") as graphql.ReviewToReviewLifecycle.PullRequest;

        const state = (pr.state === "closed" ?
            ((pr.merged === true || pr.merged) ? "merged" : "closed") : "open");

        msg.text = `${url(reviewUrl(repo, pr, review), "New review")}`
            + ` on ${state} pull request ${bold(url(prUrl(repo, pr),
                `#${pr.number} ${pr.title}`))}`;
        msg.attachments = [];

        return Promise.resolve(msg);
    }
}

export class ReviewDetailNodeRenderer extends AbstractIdentifiableContribution
    implements SlackNodeRenderer<graphql.ReviewToReviewLifecycle.Review> {

    constructor() {
        super("reviewdetail");
    }

    public supports(node: any): boolean {
        return node.pullRequest;
    }

    public render(review: graphql.ReviewToReviewLifecycle.Review, actions: Action[], msg: SlackMessage,
                  context: RendererContext): Promise<SlackMessage> {
        const repo = context.lifecycle.extract("repo");
        const pr = context.lifecycle.extract("pullrequest") as graphql.ReviewToReviewLifecycle.PullRequest;

        const state = (pr.state === "closed" ?
            ((pr.merged === true || pr.merged) ? "merged" : "closed") : "open");

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

        const body = review.body ? githubToSlack(review.body) : review.body;
        return linkGitHubUsers(body, context.context)
            .then(b => {
                const attachment: Attachment = {
                    color,
                    title,
                    title_link: reviewUrl(repo, pr, review),
                    text: linkIssues(b, repo),
                    author_name: `@${review.by[0].login}`,
                    author_icon: avatarUrl(repo, review.by[0].login),
                    author_link: userUrl(repo, review.by[0].login),
                    fallback: `New review on #${pr.number} ${pr.title}`,
                    mrkdwn_in: ["text", "pretext"],
                    footer: repoAndlabelsAndAssigneesFooter(repo, pr.labels, pr.reviewers),
                    footer_icon: `https://images.atomist.com/rug/pull-request-${state}.png`,
                    actions,
                };
                msg.attachments.push(attachment);
                return Promise.resolve(msg);
            });
    }
}
