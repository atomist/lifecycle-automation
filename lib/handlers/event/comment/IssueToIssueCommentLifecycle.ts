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
 * Send a lifecycle message on Issue events.
 */
@EventHandler("Send a lifecycle message on Issue events",
    GraphQL.subscription("issueToIssueCommentLifecycle"))
@Tags("lifecycle", "issue")
export class IssueToIssueCommentLifecycle
    extends CommentLifecycleHandler<graphql.IssueToIssueCommentLifecycle.Subscription> {

    protected extractNodes(event: EventFired<graphql.IssueToIssueCommentLifecycle.Subscription>):
        [graphql.IssueToIssueCommentLifecycle.Comments[], graphql.IssueToIssueCommentLifecycle.Issue,
            any, graphql.IssueToIssueCommentLifecycle.Repo, boolean] {

        const issue = event.data.Issue[0];
        if (issue) {
            return [issue.comments.sort((c1, c2) =>
                c1.timestamp.localeCompare(c2.timestamp)), issue, null, _.get(issue, "repo"), true];
        } else {
            return [null, null, null, null, true];
        }
    }

    protected extractPreferences(
        event: EventFired<graphql.IssueToIssueCommentLifecycle.Subscription>): { [teamId: string]: Preferences[] } {
        return chatTeamsToPreferences(_.get(event, "data.Issue[0].repo.org.team.chatTeams"));
    }
}
