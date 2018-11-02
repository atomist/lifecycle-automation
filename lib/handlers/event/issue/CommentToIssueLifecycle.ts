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
import * as graphql from "../../../typings/types";
import { IssueCardLifecycleHandler } from "./IssueLifecycle";

/**
 * Send a lifecycle card on Comment events.
 */
@EventHandler("Send a lifecycle message on Comment events",
    GraphQL.subscription("commentToIssueLifecycle"))
@Tags("lifecycle", "issue")
export class CommentToIssueCardLifecycle
    extends IssueCardLifecycleHandler<graphql.CommentToIssueLifecycle.Subscription> {

    protected extractNodes(event: EventFired<graphql.CommentToIssueLifecycle.Subscription>):
        [graphql.CommentToIssueLifecycle.Issue,
            graphql.IssueFields.Repo,
            graphql.CommentToIssueLifecycle.Comment,
            string] {
        const issue = _.get(event.data, "Comment[0].issue") as graphql.CommentToIssueLifecycle.Issue;
        return [issue, _.get(event.data, "Comment[0].issue.repo"), _.get(event.data, "Comment[0]"),
            (issue ? Date.parse(issue.timestamp).toString() : Date.now().toString())];
    }

    protected extractPreferences(event: EventFired<graphql.CommentToIssueLifecycle.Subscription>)
        : { [teamId: string]: Preferences[] } {
        return {};
    }
}
