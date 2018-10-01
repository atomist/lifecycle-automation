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
import { prNotification } from "../../../util/notifications";
import { CommentGitHubIssue } from "../../command/github/CommentGitHubIssue";
import { ReactGitHubIssueComment } from "../../command/github/ReactGitHubIssueComment";

@EventHandler("Notify mentioned user in slack", subscription("notifyMentionedOnPullRequestComment"))
@Tags("lifecycle", "pr comment", "notification")
export class NotifyMentionedOnPullRequestComment
    implements HandleEvent<graphql.NotifyMentionedOnPullRequestComment.Subscription> {

    public handle(event: EventFired<graphql.NotifyMentionedOnPullRequestComment.Subscription>,
                  ctx: HandlerContext): Promise<HandlerResult> {

        const comment = event.data.Comment[0];
        const pr = comment.pullRequest;

        if (pr) {
            return prNotification(`${pr.number}/${comment._id}`, "New mention in comment on pull request",
                comment.body, comment.by, pr, pr.repo, ctx)
                .then(_ => Success, failure);
        } else {
            return Promise.resolve(Success);
        }
    }
}

/**
 * Add comment and +1 action into the DM
 * @param {NotifyMentionedOnPullRequestComment.Comment} comment
 * @returns {Action[]}
 */
function createActions(comment: graphql.NotifyMentionedOnPullRequestComment.Comment): Action[] {

    const commentIssue = new CommentGitHubIssue();
    commentIssue.owner = comment.pullRequest.repo.owner;
    commentIssue.repo = comment.pullRequest.repo.name;
    commentIssue.issue = comment.pullRequest.number;

    const reactComment = new ReactGitHubIssueComment();
    reactComment.owner = comment.pullRequest.repo.owner;
    reactComment.repo = comment.pullRequest.repo.name;
    reactComment.comment = comment.gitHubId;
    reactComment.reaction = "+1";

    return [
        buttonForCommand({ text: "Comment" }, commentIssue),
        buttonForCommand( { text: ":+1:" }, reactComment),
    ];
}
