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
import { PullRequestCardLifecycleHandler,
    PullRequestLifecycleHandler } from "./PullRequestLifecycle";

/**
 * Send a lifecycle message on Commit events.
 */
@EventHandler("Send a lifecycle message on Commit events",
    subscription("commitToPullRequestLifecycle"))
@Tags("lifecycle", "pr", "commit")
export class CommitToPullRequestLifecycle
    extends PullRequestLifecycleHandler<graphql.CommitToPullRequestLifecycle.Subscription> {

    protected extractNodes(event: EventFired<graphql.CommitToPullRequestLifecycle.Subscription>):
        [graphql.CommitToPullRequestLifecycle.PullRequests, graphql.PullRequestFields.Repo,
            string, boolean] {

        const pr = _.get(event, "data.Commit[0].pullRequests[0]");
        return [pr, _.get(pr, "repo"), Date.now().toString(), true];
    }

    protected extractPreferences(
        event: EventFired<graphql.CommitToPullRequestLifecycle.Subscription>)
        : { [teamId: string]: Preferences[] } {
        return chatTeamsToPreferences(_.get(event, "data.Commit[0].pullRequests[0].repo.org.team.chatTeams"));
    }
}

/**
 * Send a lifecycle card on Commit events.
 */
@EventHandler("Send a lifecycle card on Commit events",
    subscription("commitToPullRequestLifecycle"))
@Tags("lifecycle", "pr", "commit")
export class CommitToPullRequestCardLifecycle
    extends PullRequestCardLifecycleHandler<graphql.CommitToPullRequestLifecycle.Subscription> {

    protected extractNodes(event: EventFired<graphql.CommitToPullRequestLifecycle.Subscription>):
        [graphql.CommitToPullRequestLifecycle.PullRequests, graphql.PullRequestFields.Repo,
            string, boolean] {

        const pr = _.get(event, "data.Commit[0].pullRequests[0]");
        return [pr, _.get(pr, "repo"), Date.now().toString(), true];
    }

    protected extractPreferences(
        event: EventFired<graphql.CommitToPullRequestLifecycle.Subscription>)
        : { [teamId: string]: Preferences[] } {
        return {};
    }
}
