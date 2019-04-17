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
 * Send a lifecycle message on K8Pod events.
 */
export function k8PodToPushLifecycle(contributions: Contributions)
    : EventHandlerRegistration<graphql.K8PodToPushLifecycle.Subscription, LifecycleParametersDefinition> {
    return {
        name: "K8PodToPushLifecycle",
        description: "Send a push lifecycle message on K8Pod events",
        tags: ["lifecycle", "push", "k8pod"],
        parameters: LifecycleParameters,
        subscription: GraphQL.subscription("k8PodToPushLifecycle"),
        listener: async (e, ctx, params) => {
            return lifecycle<graphql.K8PodToPushLifecycle.Subscription>(
                e,
                params,
                ctx,
                () => new PushLifecycleHandler(
                    e => {
                        const pushes = [];
                        e.data.K8Pod[0].images
                            .filter(i => i.commits && i.commits.length > 0)
                            .forEach(i => pushes.push(...i.commits[0].pushes));
                        return pushes;
                    },
                    e => chatTeamsToPreferences(
                        _.get(e, "data.K8Pod[0].images[0].commits[0].pushes[0].repo.org.team.chatTeams")),
                    contributions,
                ),
            );
        },
    };
}

/**
 * Send a lifecycle card on K8Pod events.
 */
export function k8PodToPushCardLifecycle(contributions: Contributions): EventHandlerRegistration<graphql.K8PodToPushLifecycle.Subscription, LifecycleParametersDefinition> {
    return {
        name: "K8PodToPushCardLifecycle",
        description: "Send a push lifecycle card on K8Pod events",
        tags: ["lifecycle", "push", "k8pod"],
        parameters: LifecycleParameters,
        subscription: GraphQL.subscription("k8PodToPushLifecycle"),
        listener: async (e, ctx, params) => {
            return lifecycle<graphql.K8PodToPushLifecycle.Subscription>(
                e,
                params,
                ctx,
                () => new PushCardLifecycleHandler(
                    e => {
                        const pushes = [];
                        e.data.K8Pod[0].images
                            .filter(i => i.commits && i.commits.length > 0)
                            .forEach(i => pushes.push(...i.commits[0].pushes));
                        return pushes;
                    },
                    contributions,
                ));
        },
    };
}
