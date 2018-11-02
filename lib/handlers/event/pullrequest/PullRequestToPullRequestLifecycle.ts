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
 * Send a lifecycle message on PullRequest events.
 */
@EventHandler("Send a lifecycle message on PullRequest events",
    GraphQL.subscription("pullRequestToPullRequestLifecycle"))
@Tags("lifecycle", "pr")
export class PullRequestToPullRequestLifecycle
    extends PullRequestLifecycleHandler<graphql.PullRequestToPullRequestLifecycle.Subscription> {

    protected extractNodes(event: EventFired<graphql.PullRequestToPullRequestLifecycle.Subscription>):
        [graphql.PullRequestToPullRequestLifecycle.PullRequest,
            graphql.PullRequestFields.Repo,
            string, boolean] {

        return [event.data.PullRequest[0], event.data.PullRequest[0].repo, Date.now().toString(), false];
    }

    protected extractPreferences(
        event: EventFired<graphql.PullRequestToPullRequestLifecycle.Subscription>)
        : { [teamId: string]: Preferences[] } {
        return chatTeamsToPreferences(_.get(event, "data.PullRequest[0].repo.org.team.chatTeams"));
    }
}

/**
 * Send a lifecycle card on PullRequest events.
 */
@EventHandler("Send a lifecycle card on PullRequest events",
    GraphQL.subscription("pullRequestToPullRequestLifecycle"))
@Tags("lifecycle", "pr")
export class PullRequestToPullRequestCardLifecycle
    extends PullRequestCardLifecycleHandler<graphql.PullRequestToPullRequestLifecycle.Subscription> {

    protected extractNodes(event: EventFired<graphql.PullRequestToPullRequestLifecycle.Subscription>):
        [graphql.PullRequestToPullRequestLifecycle.PullRequest,
        graphql.PullRequestFields.Repo,
        string, boolean] {

        return [event.data.PullRequest[0], event.data.PullRequest[0].repo, Date.now().toString(), false];
    }

    protected extractPreferences(
        event: EventFired<graphql.PullRequestToPullRequestLifecycle.Subscription>)
        : { [teamId: string]: Preferences[] } {
        return {};
    }
}
