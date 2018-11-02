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
    EventFired,
    failure,
    HandlerContext,
    HandlerResult,
    QueryNoCacheOptions,
    Success,
    SuccessPromise,
    Tags,
} from "@atomist/automation-client";
import { EventHandler } from "@atomist/automation-client/lib/decorators";
import * as GraphQL from "@atomist/automation-client/lib/graph/graphQL";
import { HandleEvent } from "@atomist/automation-client/lib/HandleEvent";
import * as graphql from "../../../typings/types";
import { BranchToBranchLifecycle } from "./BranchToBranchLifecycle";

/**
 * Send a lifecycle message on PullRequest events.
 */
@EventHandler("Send a lifecycle message on Branch events",
    GraphQL.subscription("pullRequestToBranchLifecycle"))
@Tags("lifecycle", "branch", "pr")
export class PullRequestToBranchLifecycle implements HandleEvent<graphql.PullRequestToBranchLifecycle.Subscription> {

    public handle(e: EventFired<graphql.PullRequestToBranchLifecycle.Subscription>,
                  ctx: HandlerContext): Promise<HandlerResult> {
        const pr = e.data.PullRequest[0];

        return ctx.graphClient.query
                <graphql.BranchWithPullRequest.Query, graphql.BranchWithPullRequest.Variables>({
                name: "branchWithPullRequest",
                variables: { id: pr.branch.id },
                options: QueryNoCacheOptions,
            })
            .then(result => {
                if (result && result.Branch && result.Branch.length > 0) {
                    const handler = new BranchToBranchLifecycle();
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
                    return handler.handle(event, ctx);
                } else {
                    return SuccessPromise;
                }
            })
            .then(() => Success, failure);
    }
}
