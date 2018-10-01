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
import { buttonForCommand } from "@atomist/automation-client/spi/message/MessageClient";
import { Action } from "@atomist/slack-messages";
import * as graphql from "../../../typings/types";
import { issueNotification } from "../../../util/notifications";
import { CommentGitHubIssue } from "../../command/github/CommentGitHubIssue";
import { ReactGitHubIssueComment } from "../../command/github/ReactGitHubIssueComment";

@EventHandler("Notify mentioned user in slack", subscription("notifyMentionedOnIssueComment"))
@Tags("lifecycle", "issue comment", "notification")
export class NotifyMentionedOnIssueComment implements HandleEvent<graphql.NotifyMentionedOnIssueComment.Subscription> {

    public handle(event: EventFired<graphql.NotifyMentionedOnIssueComment.Subscription>, ctx: HandlerContext):
        Promise<HandlerResult> {

        const comment = event.data.Comment[0];
        const issue = comment.issue;

        if (issue) {
            const repo = issue.repo;
            return issueNotification(`${issue.number}/${comment._id}`, "New mention in comment on issue",
                comment.body, comment.by.login, issue, repo, ctx, createActions(comment))
                .then(() => Success, failure);
        } else {
            return Promise.resolve(Success);
        }
    }
}

/**
 * Add comment and +1 action into the DM
 * @param {NotifyMentionedOnIssueComment.Comment} comment
 * @returns {Action[]}
 */
function createActions(comment: graphql.NotifyMentionedOnIssueComment.Comment): Action[] {

    const commentIssue = new CommentGitHubIssue();
    commentIssue.owner = comment.issue.repo.owner;
    commentIssue.repo = comment.issue.repo.name;
    commentIssue.issue = comment.issue.number;

    const reactComment = new ReactGitHubIssueComment();
    reactComment.owner = comment.issue.repo.owner;
    reactComment.repo = comment.issue.repo.name;
    reactComment.comment = comment.gitHubId;
    reactComment.reaction = "+1";

    return [
        buttonForCommand({ text: "Comment" }, commentIssue),
        buttonForCommand( { text: ":+1:" }, reactComment),
    ];
}
