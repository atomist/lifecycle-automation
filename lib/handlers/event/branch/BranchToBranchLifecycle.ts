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
import { BranchLifecycle } from "./BranchLifecycle";

/**
 * Send a lifecycle message on Branch events.
 */
export function branchToBranchLifecycle(contributions: Contributions)
    : EventHandlerRegistration<graphql.BranchToBranchLifecycle.Subscription, LifecycleParametersDefinition> {
    return {
        name: "BranchToBranchLifecycle",
        description: "Send a branch lifecycle message on Branch events",
        tags: ["lifecycle", "branch"],
        parameters: LifecycleParameters,
        subscription: GraphQL.subscription("branchToBranchLifecycle"),
        listener: async (e, ctx, params) => {
            return lifecycle<graphql.BranchToBranchLifecycle.Subscription>(
                e,
                params,
                ctx,
                () => new BranchLifecycle(
                    e => {
                        const branch = _.get(e, "data.Branch[0]");
                        return [[branch], branch.repo, false];
                    },
                    e => chatTeamsToPreferences(
                        _.get(e, "data.Branch[0].repo.org.team.chatTeams")),
                    contributions,
                ),
            );
        },
    };
}
