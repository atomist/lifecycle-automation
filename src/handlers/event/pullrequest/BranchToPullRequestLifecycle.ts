/*
 * Copyright © 2018 Atomist, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
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
import * as GraphQL from "@atomist/automation-client/graph/graphQL";
import * as _ from "lodash";
import { Preferences } from "../../../lifecycle/Lifecycle";
import { chatTeamsToPreferences } from "../../../lifecycle/util";
import * as graphql from "../../../typings/types";
import { PullRequestLifecycleHandler } from "./PullRequestLifecycle";

/**
 * Send a lifecycle message on Branch events.
 */
@EventHandler("Send a lifecycle message on Branch events",
    GraphQL.subscriptionFromFile("../../../graphql/subscription/branchToPullRequest", __dirname))
@Tags("lifecycle", "pr", "branch")
export class BranchToPullRequestLifecycle
    extends PullRequestLifecycleHandler<graphql.BranchToPullRequestLifecycle.Subscription> {

    protected extractNodes(event: EventFired<graphql.BranchToPullRequestLifecycle.Subscription>):
        [graphql.BranchToPullRequestLifecycle.PullRequests, graphql.BranchToPullRequestLifecycle.Repo,
            string, boolean ] {

        const pr = _.get(event, "data.Branch[0].pullRequests[0]");
        return [pr, _.get(pr, "repo"), Date.now().toString(), true];
    }

    protected extractPreferences(
        event: EventFired<graphql.BranchToPullRequestLifecycle.Subscription>)
        : { [teamId: string]: Preferences[] } {
        return chatTeamsToPreferences(_.get(event, "data.Branch[0].pullRequests[0].repo.org.team.chatTeams"));
    }
}
