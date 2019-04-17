/*
 * Copyright © 2019 Atomist, Inc.
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
import { PushLifecycleHandler } from "./PushLifecycle";

/**
 * Send a Push lifecycle message on SdmGoalDisplay events.
 */
export function sdmGoalDisplayToPushLifecycle(contributions: Contributions)
    : EventHandlerRegistration<graphql.SdmGoalDisplayToPushLifecycle.Subscription, LifecycleParametersDefinition> {
    return {
        name: "SdmGoalDisplayToPushLifecycle",
        description: "Send a push lifecycle message on SdmGoalDisplay events",
        tags: ["lifecycle", "push", "sdm goal display"],
        parameters: LifecycleParameters,
        subscription: GraphQL.subscription("sdmGoalDisplayToPushLifecycle"),
        listener: async (e, ctx, params) => {
            return lifecycle<graphql.SdmGoalDisplayToPushLifecycle.Subscription>(
                e,
                params,
                ctx,
                () => new PushLifecycleHandler(
                    e => [e.data.SdmGoalDisplay[0].push],
                    e => chatTeamsToPreferences(
                        _.get(e, "data.SdmGoalDisplay[0].push.repo.org.team.chatTeams")),
                    contributions,
                ),
            );
        },
    };
}
