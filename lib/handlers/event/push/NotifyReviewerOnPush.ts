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
    EventFired,
    EventHandler,
    failure,
    HandleEvent,
    HandlerContext,
    HandlerResult,
    Success,
    Tags,
} from "@atomist/automation-client";
import { subscription } from "@atomist/automation-client/graph/graphQL";
import * as graphql from "../../../typings/types";
import { reviewerNotification } from "../../../util/notifications";

/**
 * Event Handler that sends a DM to the reviewers of open and unmerged pull requests to notify them about new commits
 * on the pull request.
 *
 * Only reviewers of reviews that have had activity are being messaged; a review that is in requested state won't
 * trigger this notification.
 *
 * This DM can be disabled via the `@atomist configured dm` command.
 */
@EventHandler("Notify pull request reviewer about new commits", subscription("notifyReviewerOnPush"))
@Tags("lifecycle", "pr", "notification")
export class NotifyReviewerOnPush implements HandleEvent<graphql.NotifyReviewerOnPush.Subscription> {

    public handle(event: EventFired<graphql.NotifyReviewerOnPush.Subscription>,
                  ctx: HandlerContext): Promise<HandlerResult> {
        const push = event.data.Push[0];

        if (push.commits) {
            const commitWithPr = push.commits.find(
                c => c.pullRequests != null && c.pullRequests.length > 0);
            if (commitWithPr) {
                const pr = commitWithPr.pullRequests[0];

                const reviewers = pr.reviewers ? pr.reviewers.map(r => r.login) : [];
                const reviews = pr.reviews ? pr.reviews.filter(r => r.state !== "requested")
                    .filter(r => r.by && r.by.some(rr => reviewers.indexOf(rr.login) >= 0)) : [];

                if (pr.state === "open" && reviews && reviews.length > 0) {
                    return Promise.all(reviews.map(r => reviewerNotification(push, pr, push.repo, r, ctx)))
                        .then(() => Success, failure);
                }
            }
        }
        return Promise.resolve(Success);
    }
}
