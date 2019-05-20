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

import { Configuration } from "@atomist/automation-client";
import { configureDashboardNotifications } from "@atomist/automation-client-ext-dashboard";
import { configureHumio } from "@atomist/automation-client-ext-humio";
import { configureRaven } from "@atomist/automation-client-ext-raven";
import { configure } from "@atomist/sdm-core";
import { githubLifecycleSupport } from "@atomist/sdm-pack-lifecycle-github";
import {
    githubAutoMergeSupport,
    githubConvergeSupport,
} from "@atomist/sdm-pack-rcca-github";
import * as _ from "lodash";

export const configuration = configure(async sdm => {

    sdm.addExtensionPacks(
        githubLifecycleSupport(),
        githubAutoMergeSupport(),
        githubConvergeSupport({
            events: { repoGenerated: true },
        }));

    const cfg: Configuration = {
        ws: {
            timeout: 60000,
        },
        cluster: {
            maxConcurrentPerWorker: 10,
        },
        redact: {
            log: true,
            messages: false,
        },
    };

    _.merge(sdm.configuration, cfg);

}, {
    name: "Lifecycle Software Delivery Machine",
    postProcessors: [
        configureDashboardNotifications,
        configureRaven,
        configureHumio,
    ],
});
