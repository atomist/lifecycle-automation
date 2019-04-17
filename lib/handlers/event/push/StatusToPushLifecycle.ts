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
 * Send a Push lifecycle message on Status events.
 */
export function statusToPushLifecycle(contributions: Contributions)
    : EventHandlerRegistration<graphql.StatusToPushLifecycle.Subscription, LifecycleParametersDefinition> {
    return {
        name: "StatusToPushLifecycle",
        description: "Send a push lifecycle message on Status events",
        tags: ["lifecycle", "push", "status"],
        parameters: LifecycleParameters,
        subscription: GraphQL.subscription("statusToPushLifecycle"),
        listener: async (e, ctx, params) => {
            return lifecycle<graphql.StatusToPushLifecycle.Subscription>(
                e,
                params,
                ctx,
                () => new PushLifecycleHandler(
                    e => e.data.Status[0].commit.pushes,
                    e => chatTeamsToPreferences(
                        _.get(e, "data.Status[0].commit.pushes[0].repo.org.team.chatTeams")),
                    contributions,
                ),
            );
        },
    };
}

/**
 * Send a Push lifecycle card on Status events.
 */
export function statusToPushCardLifecycle(contributions: Contributions)
    : EventHandlerRegistration<graphql.StatusToPushLifecycle.Subscription, LifecycleParametersDefinition> {
    return {
        name: "StatusToPushCardLifecycle",
        description: "Send a push lifecycle card on Status events",
        tags: ["lifecycle", "push", "status"],
        parameters: LifecycleParameters,
        subscription: GraphQL.subscription("buildToPushLifecycle"),
        listener: async (e, ctx, params) => {
            return lifecycle<graphql.StatusToPushLifecycle.Subscription>(
                e,
                params,
                ctx,
                () => new PushCardLifecycleHandler(
                    e => {// filter CI statuses as we don't want them to overwrite
                        const cis = ["travis", "jenkins", "circle", "codeship"];
                        const status = e.data.Status[0];
                        if (!cis.some(ci => status.context.includes(ci))) {
                            return e.data.Status[0].commit.pushes;
                        } else {
                            return [];
                        }
                    },
                    contributions,
                ),
            );
        },
    };
}

