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
    buttonForCommand,
    failure,
    GraphQL,
    Success,
    SuccessPromise,
} from "@atomist/automation-client";
import { EventHandlerRegistration } from "@atomist/sdm";
import { Action } from "@atomist/slack-messages";
import { graphql } from "graphql";
import { NotifyMentionedOnIssue } from "../../../typings/types";
import {
    issueAssigneeNotification,
    issueNotification,
} from "../../../util/notifications";
import { CommentGitHubIssue } from "../../command/github/CommentGitHubIssue";
import { ReactGitHubIssue } from "../../command/github/ReactGitHubIssue";

export function notifyMentionedOnIssue(): EventHandlerRegistration<NotifyMentionedOnIssue.Subscription> {
    return {
        name: "NotifyMentionedOnIssue",
        description: "Notify mentioned user in slack",
        tags: ["lifecycle", "issue", "notification"],
        subscription: GraphQL.subscription("notifyMentionedOnIssue"),
        listener: async (e, ctx) => {
            const issue = e.data.Issue[0];
            const repo = issue.repo;

            if (issue.number) {
                return issueNotification(issue.number.toString(), "New mention in issue",
                    issue.body, issue.openedBy.login, issue, repo, ctx, createActions(issue))
                    .then(_ => {
                        if (issue.assignees != null) {
                            return Promise.all(issue.assignees.map(a =>
                                issueAssigneeNotification(issue.number.toString(), "New assignment of issue", issue.body,
                                    a, issue, repo, ctx)));
                        } else {
                            return Promise.resolve(null);
                        }
                    })
                    .then(() => Success, failure);
            } else {
                return SuccessPromise;
            }
        },
    };
}

/**
 * Add comment and +1 action into the DM
 * @param {NotifyMentionedOnIssue.Issue} issue
 * @returns {Action[]}
 */
function createActions(issue: NotifyMentionedOnIssue.Issue): Action[] {

    const commentIssue = new CommentGitHubIssue();
    commentIssue.owner = issue.repo.owner;
    commentIssue.repo = issue.repo.name;
    commentIssue.issue = issue.number;

    const reactIssue = new ReactGitHubIssue();
    reactIssue.owner = issue.repo.owner;
    reactIssue.repo = issue.repo.name;
    reactIssue.issue = issue.number;
    reactIssue.reaction = "+1";

    return [
        buttonForCommand({ text: "Comment" }, commentIssue),
        buttonForCommand({ text: ":+1:" }, reactIssue),
    ];
}
