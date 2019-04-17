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
import {
    PushCardLifecycleHandler,
    PushLifecycleHandler,
} from "./PushLifecycle";

/**
 * Send a Push lifecycle message on SdmGoal events.
 */
export function sdmGoalToPushLifecycle(contributions: Contributions)
    : EventHandlerRegistration<graphql.SdmGoalToPushLifecycle.Subscription, LifecycleParametersDefinition> {
    return {
        name: "SdmGoalToPushLifecycle",
        description: "Send a push lifecycle message on SdmGoal events",
        tags: ["lifecycle", "push", "sdm goal"],
        parameters: LifecycleParameters,
        subscription: GraphQL.subscription("sdmGoalToPushLifecycle"),
        listener: async (e, ctx, params) => {
            return lifecycle<graphql.SdmGoalToPushLifecycle.Subscription>(
                e,
                params,
                ctx,
                () => new PushLifecycleHandler(
                    e => [e.data.SdmGoal[0].push],
                    e => chatTeamsToPreferences(
                        _.get(e, "\"data.SdmGoal[0].push.repo.org.team.chatTeams")),
                    contributions,
                ),
            );
        },
    };
}

/**
 * Send a lifecycle card on SdmGoal events.
 */
export function sdmGoalToPushCardLifecycle(contributions: Contributions)
    : EventHandlerRegistration<graphql.SdmGoalToPushLifecycle.Subscription, LifecycleParametersDefinition> {
    return {
        name: "SdmGoalToPushCardLifecycle",
        description: "Send a push lifecycle card on SdmGoal events",
        tags: ["lifecycle", "push", "sdm goal"],
        parameters: LifecycleParameters,
        subscription: GraphQL.subscription("sdmGoalToPushLifecycle"),
        listener: async (e, ctx, params) => {
            return lifecycle<graphql.SdmGoalToPushLifecycle.Subscription>(
                e,
                params,
                ctx,
                () => new PushCardLifecycleHandler(
                    e => [e.data.SdmGoal[0].push],
                    contributions,
                ),
            );
        },
    };
}
