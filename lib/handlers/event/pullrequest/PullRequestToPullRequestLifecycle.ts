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
    GraphQL,
    Maker,
} from "@atomist/automation-client";
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
    PullRequestCardLifecycleHandler,
    PullRequestLifecycleHandler,
} from "./PullRequestLifecycle";

/**
 * Send a lifecycle message on PullRequest events.
 */
export function pullRequestToPullRequestLifecycle(contributions: Contributions,
                                                  maker?: Maker<PullRequestLifecycleHandler<graphql.PullRequestToPullRequestLifecycle.Subscription>>)
    : EventHandlerRegistration<graphql.PullRequestToPullRequestLifecycle.Subscription, LifecycleParametersDefinition> {

    const defaultMaker: Maker<PullRequestLifecycleHandler<graphql.PullRequestToPullRequestLifecycle.Subscription>> =
        () => new PullRequestLifecycleHandler(
            e => [e.data.PullRequest[0], e.data.PullRequest[0].repo, Date.now().toString(), false],
            e => chatTeamsToPreferences(
                _.get(e, "data.PullRequest[0].repo.org.team.chatTeams")),
            contributions,
        );

    return {
        name: "PullRequestToPullRequestLifecycle",
        description: "Send a PR lifecycle message on PullRequest events",
        tags: ["lifecycle", "pr"],
        parameters: LifecycleParameters,
        subscription: GraphQL.subscription("pullRequestToPullRequestLifecycle"),
        listener: async (e, ctx, params) => {
            return lifecycle<graphql.PullRequestToPullRequestLifecycle.Subscription>(
                e,
                params,
                ctx,
                !!maker ? maker : defaultMaker,
            );
        },
    };
}

/**
 * Send a lifecycle card on PullRequest events.
 */
export function pullRequestToPullRequestCardLifecycle(contributions: Contributions)
    : EventHandlerRegistration<graphql.PullRequestToPullRequestLifecycle.Subscription, LifecycleParametersDefinition> {
    return {
        name: "PullRequestToPullRequestCardLifecycle",
        description: "Send a pr lifecycle card on PullRequest events",
        tags: ["lifecycle", "pr"],
        parameters: LifecycleParameters,
        subscription: GraphQL.subscription("pullRequestToPullRequestLifecycle"),
        listener: async (e, ctx, params) => {
            return lifecycle<graphql.PullRequestToPullRequestLifecycle.Subscription>(
                e,
                params,
                ctx,
                () => new PullRequestCardLifecycleHandler(
                    e => [e.data.PullRequest[0], e.data.PullRequest[0].repo, Date.now().toString(), false],
                    contributions,
                ),
            );
        },
    };
}
