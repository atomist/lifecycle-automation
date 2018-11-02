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
 * Send a lifecycle message on Comment events.
 */
@EventHandler("Send a lifecycle message on Comment events",
    GraphQL.subscription("commentToIssueCommentLifecycle"))
@Tags("lifecycle", "issue comment", "comment")
export class CommentToIssueCommentLifecycle
    extends CommentLifecycleHandler<graphql.CommentToIssueCommentLifecycle.Subscription> {

    protected extractNodes(event: EventFired<graphql.CommentToIssueCommentLifecycle.Subscription>)
        : [graphql.CommentToIssueCommentLifecycle.Comment[], graphql.CommentToIssueCommentLifecycle.Issue,
            any, graphql.CommentToIssueCommentLifecycle.Repo, boolean] {

        const comment = _.get(event, "data.Comment[0]");
        return [[comment], _.get(comment, "issue"), null, _.get(comment, "issue.repo"), false];
    }

    protected extractPreferences(
        event: EventFired<graphql.CommentToIssueCommentLifecycle.Subscription>): { [teamId: string]: Preferences[] } {
        return chatTeamsToPreferences(_.get(event, "data.Comment[0].issue.repo.org.team.chatTeams"));
    }
}
