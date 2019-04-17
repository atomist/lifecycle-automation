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
 * Send a lifecycle message on Application events.
 */
export function applicationToPushLifecycle(contributions: Contributions)
    : EventHandlerRegistration<graphql.ApplicationToPushLifecycle.Subscription, LifecycleParametersDefinition> {
    return {
        name: "ApplicationToPushLifecycle",
        description: "Send a push lifecycle message on Application events",
        tags: ["lifecycle", "push", "application"],
        parameters: LifecycleParameters,
        subscription: GraphQL.subscription("applicationToPushLifecycle"),
        listener: async (e, ctx, params) => {
            return lifecycle<graphql.ApplicationToPushLifecycle.Subscription>(
                e,
                params,
                ctx,
                () => new PushLifecycleHandler(
                    e => {
                        const pushes = [];
                        e.data.Application[0].commits.forEach(c => pushes.push(...c.pushes));
                        return pushes;
                    },
                    e => chatTeamsToPreferences(
                        _.get(e, "data.Application[0].commits[0].pushes[0].repo.org.team.chatTeams")),
                    contributions,
                ),
            );
        },
    };
}

/**
 * Send a lifecycle card on Application events.
 */
export function applicationToPushCardLifecycle(contributions: Contributions)
    : EventHandlerRegistration<graphql.ApplicationToPushLifecycle.Subscription, LifecycleParametersDefinition> {
    return {
        name: "ApplicationToPushCardLifecycle",
        description: "Send a push lifecycle card on Application events",
        tags: ["lifecycle", "push", "application"],
        parameters: LifecycleParameters,
        subscription: GraphQL.subscription("applicationToPushLifecycle"),
        listener: async (e, ctx, params) => {
            return lifecycle<graphql.ApplicationToPushLifecycle.Subscription>(
                e,
                params,
                ctx,
                () => new PushCardLifecycleHandler(
                    e => {
                        const pushes = [];
                        e.data.Application[0].commits.forEach(c => pushes.push(...c.pushes));
                        return pushes;
                    },
                    contributions,
                ),
            );
        },
    };
}
