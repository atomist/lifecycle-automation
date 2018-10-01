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
    CommandHandler,
    Parameter,
    Tags,
} from "@atomist/automation-client";
import { AbstractCloudFoundryApplicationUpdateCommand } from "./AbstractCloudFoundryApplicationUpdateCommand";
import { CloudFoundryParameters } from "./parameters";

/**
 * Scale a Cloud Foundry application.
 */
@CommandHandler("Scale a Cloud Foundry application", "cf scale")
@Tags("cloudfoundry", "app")
export class ScaleCloudFoundryApplication extends AbstractCloudFoundryApplicationUpdateCommand {

    @Parameter(CloudFoundryParameters.guid)
    public guid: string;

    @Parameter({
        displayName: "Instances",
        description: "number of Instances",
        pattern: /^[0-9]*$/,
        validInput: "number of instances",
        minLength: 1,
        maxLength: 100,
        required: true,
    })
    public instances: number;

    protected updateApp(): any {
        return { instances: +this.instances };
    }
}
