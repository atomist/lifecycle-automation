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
 * Send a lifecycle message on Review events.
 */
@EventHandler("Send a lifecycle message on Review events", subscription("reviewToReview"))
@Tags("lifecycle", "review")
export class ReviewToReviewLifecycle extends ReviewLifecycleHandler<graphql.ReviewToReviewLifecycle.Subscription> {

    protected extractNodes(event: EventFired<graphql.ReviewToReviewLifecycle.Subscription>):
        [graphql.ReviewToReviewLifecycle.Review[], string] {

        return [event.data.Review, _.get(event, "data.Review[0].timestamp")];
    }

    protected extractPreferences(
        event: EventFired<graphql.ReviewToReviewLifecycle.Subscription>)
        : { [teamId: string]: Preferences[] } {
        return chatTeamsToPreferences(_.get(event, "data.Review[0].pullRequest.repo.org.team.chatTeams"));
    }
}
