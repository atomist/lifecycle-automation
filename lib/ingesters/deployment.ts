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
    buildIngester,
    buildType,
    IngesterBuilder,
} from "@atomist/automation-client/ingesters";

export const DeploymentRootType = "Deployment";

export interface Deployment {
    commit: {
        sha: string;
        owner: string;
        repo: string;
    };
    environment: string;
    ts: number;
}

export const deploymentIngester: IngesterBuilder = buildIngester(DeploymentRootType)
    .withType(buildType("DeploymentCommit")
        .withStringField("owner", "", ["compositeId"])
        .withStringField("repo", "", ["compositeId"])
        .withStringField("sha", "", ["compositeId"]))
    .withType(buildType("Deployment")
        .withObjectField(
            "commit",
            "DeploymentCommit",
            "The commit that got deployed",
            ["owner", "repo", "sha"])
        .withStringField(
            "environment",
            "The name of environment the commit got deployed",
            ["compositeId"])
        .withIntField("ts"));
