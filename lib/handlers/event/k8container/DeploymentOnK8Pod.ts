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

import {
    addressEvent,
    GraphQL,
    HandlerContext,
    Success,
} from "@atomist/automation-client";
import { EventHandlerRegistration } from "@atomist/sdm";
import {
    Deployment,
    DeploymentOnK8Pod,
} from "../../../typings/types";

export function deploymentOnK8Pod(): EventHandlerRegistration<DeploymentOnK8Pod.Subscription> {
    return {
        name: "DeploymentOnK8Pod",
        description: "Create a deployment on running K8 container events",
        tags: ["lifecycle", "k8s"],
        subscription:   GraphQL.subscription("deploymentOnK8Pod"),
        listener: async (e, ctx) => {
            const pod = e.data.K8Pod[0];
            const containers = pod.containers;

            for (const container of containers) {
                const commit = container.image.commits[0];

                const deployment = {
                    commit: {
                        owner: commit.repo.owner,
                        repo: commit.repo.name,
                        sha: commit.sha,
                    },
                    environment: `${pod.environment}:${pod.namespace}`,
                    ts: Date.now(),
                };

                if (container.ready && !(await isDeployed(deployment, ctx))) {
                    await ctx.messageClient.send(deployment, addressEvent("Deployment"));
                }
            }

            return Success;
        },
    };

}

async function isDeployed(deployment: any,
                          ctx: HandlerContext): Promise<boolean> {
    const result = await ctx.graphClient.query<Deployment.Query, Deployment.Variables>({
        name: "Deployment",
        variables: {
            owner: [deployment.commit.owner],
            repo: [deployment.commit.repo],
            sha: [deployment.commit.sha],
            environment: [deployment.environment],
        },
    });

    return result.Deployment && result.Deployment.length > 0;
}
