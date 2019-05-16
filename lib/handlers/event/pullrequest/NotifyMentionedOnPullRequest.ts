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
    failure,
    GraphQL,
    Success,
} from "@atomist/automation-client";
import { EventHandlerRegistration } from "@atomist/sdm";
import { NotifyMentionedOnPullRequest } from "../../../typings/types";
import {
    prAssigneeNotification,
    prAuthorMergeNotification,
    prNotification,
    prRevieweeNotification,
} from "../../../util/notifications";

export function notifyMentionedOnPullRequest(): EventHandlerRegistration<NotifyMentionedOnPullRequest.Subscription> {
    return {
        name: "NotifyMentionedOnPullRequest",
        description: "Notify mentioned user in slack",
        tags: ["lifecycle", "pr", "notification"],
        subscription: GraphQL.subscription("notifyMentionedOnPullRequest"),
        listener: async (e, ctx) => {
            const pr = e.data.PullRequest[0];
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
        },
    };
}
