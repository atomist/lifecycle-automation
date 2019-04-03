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
    HandlerContext,
    HandlerResult,
    MappedParameter,
    MappedParameters,
    Parameter,
    Tags,
} from "@atomist/automation-client";
import { CommandHandler } from "@atomist/automation-client/lib/decorators";
import { HandleCommand } from "@atomist/automation-client/lib/HandleCommand";
import {
    SdmGoalDisplayFormat,
    SdmGoalDisplayState,
} from "../../../typings/types";

/**
 * Update SDM goal set display status.
 */
@CommandHandler("Update SDM goal set display status")
@Tags("sdm")
export class UpdateSdmGoalDisplayState implements HandleCommand {

    @Parameter({ description: "sha", pattern: /^.*$/, required: true })
    public sha: string;

    @Parameter({ description: "branch", pattern: /^.*$/, required: true })
    public branch: string;

    @Parameter({ description: "state", pattern: /^.*$/, required: true })
    public state: SdmGoalDisplayState;

    @Parameter({ description: "format", pattern: /^.*$/, required: true })
    public format: SdmGoalDisplayFormat;

    @MappedParameter(MappedParameters.GitHubRepository)
    public name: string;

    @MappedParameter(MappedParameters.GitHubOwner)
    public owner: string;

    @MappedParameter(MappedParameters.GitHubRepositoryProvider)
    public providerId: string;

    public async handle(ctx: HandlerContext): Promise<HandlerResult> {

        const sdmGoalDisplay: any = {
            sha: this.sha,
            branch: this.branch,
            repo: {
                name: this.name,
                owner: this.owner,
                providerId: this.providerId,
            },
            ts: Date.now(),
            state: this.state,
            format: this.format,
        };

        return ctx.messageClient.send(sdmGoalDisplay, addressEvent("SdmGoalDisplay"));
    }
}
