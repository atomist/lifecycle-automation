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
    Tags,
} from "@atomist/automation-client";
import { EventHandler } from "@atomist/automation-client/lib/decorators";
import * as GraphQL from "@atomist/automation-client/lib/graph/graphQL";
import * as _ from "lodash";
import { Preferences } from "../../../lifecycle/Lifecycle";
import { chatTeamsToPreferences } from "../../../lifecycle/util";
import * as graphql from "../../../typings/types";
import { CommentLifecycleHandler } from "./CommentLifecycle";

/**
 * Send a lifecycle message on PullRequest events.
 */
@EventHandler("Send a lifecycle message on PullRequest events",
    GraphQL.subscription("pullRequestToPullRequestCommentLifecycle"))
@Tags("lifecycle", "pullrequest")
export class PullRequestToPullRequestCommentLifecycle
    extends CommentLifecycleHandler<graphql.PullRequestToPullRequestCommentLifecycle.Subscription> {

    protected extractNodes(event: EventFired<graphql.PullRequestToPullRequestCommentLifecycle.Subscription>):
        [graphql.PullRequestToPullRequestCommentLifecycle.Comments[],
            graphql.IssueToIssueCommentLifecycle.Issue,
            graphql.PullRequestToPullRequestCommentLifecycle.PullRequest,
            graphql.PullRequestToPullRequestCommentLifecycle.Repo,
            boolean] {

        const pr = event.data.PullRequest[0];
        if (pr) {
            return [pr.comments.sort((c1, c2) =>
                c1.timestamp.localeCompare(c2.timestamp)), null, pr, _.get(pr, "repo"), true];
        } else {
            return [null, null, null, null, true];
        }
    }

    protected extractPreferences(
        event: EventFired<graphql.PullRequestToPullRequestCommentLifecycle.Subscription>)
        : { [teamId: string]: Preferences[] } {
        return chatTeamsToPreferences(_.get(event, "data.PullRequest[0].repo.org.team.chatTeams"));
    }
}
