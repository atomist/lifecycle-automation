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
    Tags,
} from "@atomist/automation-client";
import { subscription } from "@atomist/automation-client/graph/graphQL";
import * as _ from "lodash";
import { Preferences } from "../../../lifecycle/Lifecycle";
import { chatTeamsToPreferences } from "../../../lifecycle/util";
import * as graphql from "../../../typings/types";
import { CommentLifecycleHandler } from "./CommentLifecycle";

/**
 * Send a lifecycle message on Comment events.
 */
@EventHandler("Send a lifecycle message on Comment events",
    subscription("commentToPullRequestCommentLifecycle"))
@Tags("lifecycle", "pr comment", "comment")
export class CommentToPullRequestCommentLifecycle
    extends CommentLifecycleHandler<graphql.CommentToPullRequestCommentLifecycle.Subscription> {

    protected extractNodes(event: EventFired<graphql.CommentToPullRequestCommentLifecycle.Subscription>):
        [graphql.CommentToPullRequestCommentLifecycle.Comment[], graphql.IssueToIssueCommentLifecycle.Issue,
            graphql.CommentToPullRequestCommentLifecycle.PullRequest, graphql.CommentToPullRequestCommentLifecycle.Repo,
            boolean] {

        return [event.data.Comment, null, _.get(event, "data.Comment[0].pullRequest"),
        _.get(event, "data.Comment[0].pullRequest.repo"), false];
    }

    protected extractPreferences(
        event: EventFired<graphql.CommentToPullRequestCommentLifecycle.Subscription>)
        : { [teamId: string]: Preferences[] } {
        return chatTeamsToPreferences(_.get(event, "data.Comment[0].pullRequest.repo.org.team.chatTeams"));
    }
}
