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

import * as GraphQL from "@atomist/automation-client/lib/graph/graphQL";
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
 * Send a lifecycle message on Release events.
 */
export function releaseToPushLifecycle(contributions: Contributions)
    : EventHandlerRegistration<graphql.ReleaseToPushLifecycle.Subscription, LifecycleParametersDefinition> {
    return {
        name: "ReleaseToPushLifecycle",
        description: "Send a push lifecycle message on Release events",
        tags: ["lifecycle", "push", "release"],
        parameters: LifecycleParameters,
        subscription: GraphQL.subscription("releaseToPushLifecycle"),
        listener: async (e, ctx, params) => {
            return lifecycle<graphql.ReleaseToPushLifecycle.Subscription>(
                e,
                params,
                ctx,
                () => new PushLifecycleHandler(
                    e => e.data.Release[0].tag.commit.pushes,
                    e => chatTeamsToPreferences(
                        _.get(e, "data.Release[0].tag.commit.pushes[0].repo.org.team.chatTeams")),
                    contributions,
                ),
            );
        },
    };
}

/**
 * Send a lifecycle card on Release events.
 */
export function releaseToPushCardLifecycle(contributions: Contributions)
    : EventHandlerRegistration<graphql.ReleaseToPushLifecycle.Subscription, LifecycleParametersDefinition> {
    return {
        name: "ReleaseToPushCardLifecycle",
        description: "Send a push lifecycle card on Release events",
        tags: ["lifecycle", "push", "release"],
        parameters: LifecycleParameters,
        subscription: GraphQL.subscription("releaseToPushLifecycle"),
        listener: async (e, ctx, params) => {
            return lifecycle<graphql.ReleaseToPushLifecycle.Subscription>(
                e,
                params,
                ctx,
                () => new PushCardLifecycleHandler(
                    e => e.data.Release[0].tag.commit.pushes,
                    contributions,
                ),
            );
        },
    };
}
