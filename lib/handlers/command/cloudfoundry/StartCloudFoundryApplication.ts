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
    Tags,
} from "@atomist/automation-client";
import { HandlerContext } from "@atomist/automation-client/HandlerContext";
import * as cf from "cf-nodejs-client";
import { AbstractCloudFoundryApplicationCommand } from "./AbstractCloudFoundryApplicationCommand";

/**
 * Start a Cloud Foundry application.
 */
@CommandHandler("Start a Cloud Foundry application", "cf start")
@Tags("cloudfoundry", "app")
export class StartCloudFoundryApplication extends AbstractCloudFoundryApplicationCommand {

    protected doWithApp(apps: cf.Apps, ctx: HandlerContext): Promise<any> {
        return apps.start(this.guid);
    }
}
