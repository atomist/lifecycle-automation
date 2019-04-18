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

import { GraphQL } from "@atomist/automation-client";
import { EventHandlerRegistration } from "@atomist/sdm";
import * as _ from "lodash";
import {
    lifecycle,
    LifecycleParameters,
    LifecycleParametersDefinition,
} from "../../../lifecycle/Lifecycle";
import { chatTeamsToPreferences } from "../../../lifecycle/util";
import { Contributions } from "../../../machine/lifecycleSupport";
import * as graphql from "../../../typings/types";
import { ReviewLifecycleHandler } from "./ReviewLifecycle";

/**
 * Send a lifecycle message on PullRequest events.
 */
export function pullRequestToReviewLifecycle(contributions: Contributions)
    : EventHandlerRegistration<graphql.PullRequestToReviewLifecycle.Subscription, LifecycleParametersDefinition> {
    return {
        name: "PullRequestToReviewLifecycle",
        description: "Send a review lifecycle message on PullRequest events",
        tags: ["lifecycle", "review", "pr"],
        parameters: LifecycleParameters,
        subscription: GraphQL.subscription("pullRequestToReview"),
        listener: async (e, ctx, params) => {
            return lifecycle<graphql.PullRequestToReviewLifecycle.Subscription>(
                e,
                params,
                ctx,
                () => new ReviewLifecycleHandler(
                    e => {
                        const reviews = _.get(e, "data.PullRequest[0].reviews");
                        return [reviews, new Date().getTime().toString()];
                    },
                    e => chatTeamsToPreferences(
                        _.get(e, "data.PullRequest[0].reviews[0].pullRequest.repo.org.team.chatTeams")),
                    contributions,
                ),
            );
        },
    };
}
