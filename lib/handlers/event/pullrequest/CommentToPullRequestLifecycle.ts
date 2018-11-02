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
import {
    PullRequestCardLifecycleHandler,
    PullRequestLifecycleHandler,
} from "./PullRequestLifecycle";

/**
 * Send a lifecycle message on Comment events.
 */
@EventHandler("Send a lifecycle message on Comment events",
    GraphQL.subscription("commentToPullRequestLifecycle"))
@Tags("lifecycle", "pr", "comment")
export class CommentToPullRequestLifecycle
    extends PullRequestLifecycleHandler<graphql.CommentToPullRequestLifecycle.Subscription> {

    protected extractNodes(event: EventFired<graphql.CommentToPullRequestLifecycle.Subscription>):
        [graphql.CommentToPullRequestLifecycle.PullRequest, graphql.PullRequestFields.Repo,
            string, boolean] {

        const pr = _.get(event, "data.Comment[0].pullRequest");
        return [pr, _.get(pr, "repo"), Date.now().toString(), true];
    }

    protected extractPreferences(
        event: EventFired<graphql.CommentToPullRequestLifecycle.Subscription>)
        : { [teamId: string]: Preferences[] } {
        return chatTeamsToPreferences(_.get(event, "data.Comment[0].pullRequest.repo.org.team.chatTeams"));
    }
}

/**
 * Send a lifecycle card on Comment events.
 */
@EventHandler("Send a lifecycle card on Comment events",
    GraphQL.subscription("commentToPullRequestLifecycle"))
@Tags("lifecycle", "pr", "comment")
export class CommentToPullRequestCardLifecycle
    extends PullRequestCardLifecycleHandler<graphql.CommentToPullRequestLifecycle.Subscription> {

    protected extractNodes(event: EventFired<graphql.CommentToPullRequestLifecycle.Subscription>):
        [graphql.CommentToPullRequestLifecycle.PullRequest, graphql.PullRequestFields.Repo,
            string, boolean] {

        const pr = _.get(event, "data.Comment[0].pullRequest");
        return [pr, _.get(pr, "repo"), Date.now().toString(), true];
    }

    protected extractPreferences(
        event: EventFired<graphql.CommentToPullRequestLifecycle.Subscription>)
        : { [teamId: string]: Preferences[] } {
        return {};
    }
}
