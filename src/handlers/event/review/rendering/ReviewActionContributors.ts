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

import { buttonForCommand } from "@atomist/automation-client/spi/message/MessageClient";
import { Action } from "@atomist/slack-messages";
import {
    AbstractIdentifiableContribution,
    RendererContext,
    SlackActionContributor,
} from "../../../../lifecycle/Lifecycle";
import * as graphql from "../../../../typings/types";

export class CommentActionContributor extends AbstractIdentifiableContribution
    implements SlackActionContributor<graphql.ReviewToReviewLifecycle.Review> {

    constructor() {
        super("comment");
    }

    public supports(node: any): boolean {
        return node.pullRequest && (node.pullRequest as graphql.ReviewToReviewLifecycle.PullRequest).state === "open";
    }

    public buttonsFor(review: graphql.ReviewToReviewLifecycle.Review, context: RendererContext):
        Promise<Action[]> {
        const repo = context.lifecycle.extract("repo");
        const buttons = [];

        if (context.rendererId === "reviewdetail") {
            buttons.push(buttonForCommand({ text: "Comment" }, "CommentGitHubIssue",
                { issue: review.pullRequest.number, repo: repo.name, owner: repo.owner }));
        }

        return Promise.resolve(buttons);
    }

    public menusFor(review: graphql.ReviewToReviewLifecycle.Review, context: RendererContext):
        Promise<Action[]> {
        return Promise.resolve([]);
    }
}
