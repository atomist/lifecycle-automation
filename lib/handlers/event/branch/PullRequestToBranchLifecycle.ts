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
    AutomationContextAware,
    GraphQL,
    QueryNoCacheOptions,
    Success,
} from "@atomist/automation-client";
import { EventHandlerRegistration } from "@atomist/sdm";
import {
    lifecycle,
    LifecycleParameters,
    LifecycleParametersDefinition,
} from "../../../lifecycle/Lifecycle";
import { Contributions } from "../../../machine/lifecycleSupport";
import * as graphql from "../../../typings/types";
import { branchToBranchLifecycle } from "./BranchToBranchLifecycle";

/**
 * Send a lifecycle message on PullRequest events.
 */
export function pullRequestToBranchLifecycle(contributions: Contributions)
    : EventHandlerRegistration<graphql.PullRequestToBranchLifecycle.Subscription, LifecycleParametersDefinition> {
    return {
        name: "PullRequestToBranchLifecycle",
        description: "Send a branch lifecycle message on PullRequest events",
        tags: ["lifecycle", "branch", "pr"],
        parameters: LifecycleParameters,
        subscription: GraphQL.subscription("pullRequestToBranchLifecycle"),
        listener: async (e, ctx, params) => {

            const pr = e.data.PullRequest[0];

            const result = await ctx.graphClient.query<graphql.BranchWithPullRequest.Query, graphql.BranchWithPullRequest.Variables>({
                name: "branchWithPullRequest",
                variables: { id: pr.branch.id },
                options: QueryNoCacheOptions,
            });
            if (result && result.Branch && result.Branch.length > 0) {
                const handler = branchToBranchLifecycle(contributions).listener;
                const event: any = {
                    data: { Branch: result.Branch },
                    extensions: {
                        type: "READ_ONLY",
                        operationName: "PullRequestToBranchLifecycle",
                        team_id: ctx.workspaceId,
                        team_name: (ctx as any as AutomationContextAware).context.workspaceName,
                        correlation_id: ctx.correlationId,
                    },
                };
                return handler(event, ctx, params);
            }
            return Success;
        },
    };
}
