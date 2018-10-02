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
import { ReviewLifecycleHandler } from "./ReviewLifecycle";

/**
 * Send a lifecycle message on PullRequest events.
 */
@EventHandler("Send a lifecycle message on PullRequest events", subscription("pullRequestToReview"))
@Tags("lifecycle", "review", "pr")
export class PullRequestToReviewLifecycle
    extends ReviewLifecycleHandler<graphql.PullRequestToReviewLifecycle.Subscription> {

    protected extractNodes(event: EventFired<graphql.PullRequestToReviewLifecycle.Subscription>):
        [graphql.PullRequestToReviewLifecycle.Reviews[], string] {

        const reviews = _.get(event, "data.PullRequest[0].reviews");
        return [reviews, new Date().getTime().toString()];
    }

    protected extractPreferences(
        event: EventFired<graphql.PullRequestToReviewLifecycle.Subscription>)
        : { [teamId: string]: Preferences[] } {
        return chatTeamsToPreferences(
            _.get(event, "data.PullRequest[0].reviews[0].pullRequest.repo.org.team.chatTeams"));
    }
}
