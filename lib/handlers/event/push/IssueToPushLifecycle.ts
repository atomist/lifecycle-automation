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
 * Send a lifecycle message on Issue events.
 */
export function issueToPushLifecycle(contributions: Contributions)
    : EventHandlerRegistration<graphql.IssueToPushLifecycle.Subscription, LifecycleParametersDefinition> {
    return {
        name: "IssueToPushLifecycle",
        description: "Send a push lifecycle message on Issue events",
        tags: ["lifecycle", "push", "issue"],
        parameters: LifecycleParameters,
        subscription: GraphQL.subscription("issueToPushLifecycle"),
        listener: async (e, ctx, params) => {
            return lifecycle<graphql.IssueToPushLifecycle.Subscription>(
                e,
                params,
                ctx,
                () => new PushLifecycleHandler(
                    e => {
                        const pushes = [];
                        e.data.Issue[0].resolvingCommits.forEach(c => pushes.push(...c.pushes));
                        return pushes;
                    },
                    e => chatTeamsToPreferences(
                        _.get(e, "data.Issue[0].resolvingCommits[0].pushes[0].repo.org.team.chatTeams")),
                    contributions,
                ),
            );
        },
    };
}

/**
 * Send a lifecycle card on Issue events.
 */
export function issueToPushCardLifecycle(contributions: Contributions)
    : EventHandlerRegistration<graphql.IssueToPushLifecycle.Subscription, LifecycleParametersDefinition> {
    return {
        name: "IssueToPushCardLifecycle",
        description: "Send a push lifecycle card on Issue events",
        tags: ["lifecycle", "push", "issue"],
        parameters: LifecycleParameters,
        subscription: GraphQL.subscription("issueToPushLifecycle"),
        listener: async (e, ctx, params) => {
            return lifecycle<graphql.IssueToPushLifecycle.Subscription>(
                e,
                params,
                ctx,
                () => new PushCardLifecycleHandler(
                    e => {
                        const pushes = [];
                        e.data.Issue[0].resolvingCommits.forEach(c => pushes.push(...c.pushes));
                        return pushes;
                    },
                    contributions,
                ),
            );
        },
    };
};
