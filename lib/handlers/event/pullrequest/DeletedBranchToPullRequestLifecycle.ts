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
 * Send a lifecycle message on DeletedBranch events.
 */
@EventHandler("Send a lifecycle message on DeletedBranch events",
    GraphQL.subscription("deletedBranchToPullRequestLifecycle"))
@Tags("lifecycle", "pr", "status")
export class DeletedBranchToPullRequestLifecycle
    extends PullRequestLifecycleHandler<graphql.DeletedBranchToPullRequestLifecycle.Subscription> {

    protected extractNodes(event: EventFired<graphql.DeletedBranchToPullRequestLifecycle.Subscription>):
        [graphql.StatusToPullRequestLifecycle.PullRequests, graphql.PullRequestFields.Repo,
            string, boolean] {

        const pr = _.get(event, "data.DeletedBranch[0].pullRequests[0]");
        return [pr, _.get(pr, "repo"), Date.now().toString(), true];
    }

    protected extractPreferences(
        event: EventFired<graphql.DeletedBranchToPullRequestLifecycle.Subscription>)
        : { [teamId: string]: Preferences[] } {
        return chatTeamsToPreferences(
            _.get(event, "data.DeletedBranch[0].pullRequests[0].repo.org.team.chatTeams"));
    }
}

/**
 * Send a lifecycle card on DeletedBranch events.
 */
@EventHandler("Send a lifecycle card on DeletedBranch events",
    GraphQL.subscription("deletedBranchToPullRequestLifecycle"))
@Tags("lifecycle", "pr", "status")
export class DeletedBranchToPullRequestCardLifecycle
    extends PullRequestCardLifecycleHandler<graphql.DeletedBranchToPullRequestLifecycle.Subscription> {

    protected extractNodes(event: EventFired<graphql.DeletedBranchToPullRequestLifecycle.Subscription>):
        [graphql.StatusToPullRequestLifecycle.PullRequests, graphql.PullRequestFields.Repo,
            string, boolean] {

        const pr = _.get(event, "data.DeletedBranch[0].pullRequests[0]");
        return [pr, _.get(pr, "repo"), Date.now().toString(), true];
    }

    protected extractPreferences(
        event: EventFired<graphql.DeletedBranchToPullRequestLifecycle.Subscription>)
        : { [teamId: string]: Preferences[] } {
        return {};
    }
}
