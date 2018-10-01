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
import {
    prAssigneeNotification,
    prAuthorMergeNotification,
    prNotification,
    prRevieweeNotification,
} from "../../../util/notifications";

@EventHandler("Notify mentioned user in slack", subscription("notifyMentionedOnPullRequest"))
@Tags("lifecycle", "pr", "notification")
export class NotifyMentionedOnPullRequest implements HandleEvent<graphql.NotifyMentionedOnPullRequest.Subscription> {

    public handle(root: EventFired<graphql.NotifyMentionedOnPullRequest.Subscription>,
                  ctx: HandlerContext): Promise<HandlerResult> {

        const pr = root.data.PullRequest[0];
        const repo = pr.repo;

        return prNotification(pr.number.toString(), "New mention in pull request",
            pr.body, pr.author, pr, repo, ctx)
            .then(_ => {
                if (pr.assignees) {
                    return Promise.all(pr.assignees.map(a =>
                        prAssigneeNotification(pr.number.toString(), "New assignment of pull request", pr.body,
                            a, pr, repo, ctx)));
                } else {
                    return Promise.resolve(null);
                }
            })
            .then(() => {
                if (pr.reviewers) {
                    return Promise.all(pr.reviewers.map(r =>
                        prRevieweeNotification(pr.number.toString(), "New review request for pull request", pr.body,
                            r, pr, repo, ctx)));
                } else {
                    return Promise.resolve(null);
                }
            })
            .then(() => {
                if (pr.state === "closed") {
                    return prAuthorMergeNotification(pr.number.toString(), pr, repo, ctx);
                } else {
                    return Promise.resolve(null);
                }
            })
            .then(() => Success, failure);
    }
}
