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
 * Send a lifecycle message on Tag events.
 */
export function tagToPushLifecycle(contributions: Contributions)
    : EventHandlerRegistration<graphql.TagToPushLifecycle.Subscription, LifecycleParametersDefinition> {
    return {
        name: "TagToPushLifecycle",
        description: "Send a push lifecycle message on Tag events",
        tags: ["lifecycle", "push", "tag"],
        parameters: LifecycleParameters,
        subscription: GraphQL.subscription("tagToPushLifecycle"),
        listener: async (e, ctx, params) => {
            return lifecycle<graphql.TagToPushLifecycle.Subscription>(
                e,
                params,
                ctx,
                () => new PushLifecycleHandler(
                    e => e.data.Tag[0].commit.pushes,
                    e => chatTeamsToPreferences(
                        _.get(e, "data.Tag[0].commit.pushes[0].repo.org.team.chatTeams")),
                    contributions,
                ),
            );
        },
    };
}

/**
 * Send a lifecycle card on Tag events.
 */
export function tagToPushCardLifecycle(contributions: Contributions)
    : EventHandlerRegistration<graphql.TagToPushLifecycle.Subscription, LifecycleParametersDefinition> {
    return {
        name: "TagToPushCardLifecycle",
        description: "Send a push lifecycle card on Tag events",
        tags: ["lifecycle", "push", "tag"],
        parameters: LifecycleParameters,
        subscription: GraphQL.subscription("tagToPushLifecycle"),
        listener: async (e, ctx, params) => {
            return lifecycle<graphql.TagToPushLifecycle.Subscription>(
                e,
                params,
                ctx,
                () => new PushCardLifecycleHandler(
                    e => e.data.Tag[0].commit.pushes,
                    contributions,
                ),
            );
        },
    };
}
