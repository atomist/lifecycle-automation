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

import { SoftwareDeliveryMachine } from "@atomist/sdm";
import {
    createSoftwareDeliveryMachine,
    LocalSoftwareDeliveryMachineConfiguration,
} from "@atomist/sdm-core";
import { cancelGoalSetsCommand } from "@atomist/sdm-core/lib/pack/goal-state/cancelGoals";
import {
    githubAutoMergeSupport,
    githubConvergeSupport,
} from "@atomist/sdm-pack-rcca-github";
import { githubLifecycleSupport } from "./githubLifecycleSupport";

export async function machine(configuration: LocalSoftwareDeliveryMachineConfiguration)
    : Promise<SoftwareDeliveryMachine> {

    const sdm = createSoftwareDeliveryMachine({
        name: "Lifecycle Software Delivery Machine",
        configuration,
    });

    sdm.addCommand(cancelGoalSetsCommand(sdm));

    sdm.addExtensionPacks(
        githubLifecycleSupport(),
        githubAutoMergeSupport(),
        githubConvergeSupport({
            events: { repoGenerated: true },
        }));

    return sdm;
}
