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
    ConfigurableCommandHandler,
    Failure,
    HandleCommand,
    HandlerContext,
    HandlerResult,
    MappedParameter,
    MappedParameters,
    Parameter,
    Secret,
    Secrets,
    Tags,
} from "@atomist/automation-client";
import {
    codeBlock,
    codeLine,
} from "@atomist/slack-messages";
import axios from "axios";
import {
    error,
    success,
} from "../../../util/messages";
import { BuildIdParameter } from "./RestartTravisBuild";
import { retrieveToken } from "./travisApi";

@ConfigurableCommandHandler("Cancel a Travis CI build", {
    intent: [ "cancel build", "cancel travis build" ],
    autoSubmit: true,
})
@Tags("travis", "ci", "cancel")
export class CancelTravisBuild implements HandleCommand {

    @Parameter(BuildIdParameter)
    public buildId: string;

    @MappedParameter(MappedParameters.GitHubRepository)
    public repo: string;

    @MappedParameter(MappedParameters.GitHubOwner)
    public owner: string;

    @MappedParameter(MappedParameters.GitHubApiUrl)
    public apiUrl: string;

    @Secret(Secrets.userToken(["repo", "read:org", "user:email"]))
    public githubToken: string;

    public handle(ctx: HandlerContext): Promise<HandlerResult> {
        return retrieveToken(this.apiUrl, this.owner, this.repo, this.githubToken)
            .then(response => {
                return axios.post(`https://api.travis-ci.${response.tld}/builds/${this.buildId}/cancel`,
                    {},
                    {
                        headers: {
                            "Accept": "application/vnd.travis-ci.2+json",
                            "Authorization": `token ${response.token}`,
                            "User-Agent": "Travis/1.6.8",
                        },
                    });
            })
            .then(() => {
                return ctx.messageClient.respond(success(
                    "Cancel Build",
                    `Successfully canceled build ${
                        codeLine(this.buildId)} on ${codeLine(`${this.owner}/${this.repo}`)}`));
            })
            .catch(reason => {
                return ctx.messageClient.respond(error(
                    "Cancel Build",
                    `Failed to cancel build ${codeLine(this.buildId)}:\n ${codeBlock(reason)}`, ctx))
                    .then(() => {
                        return Failure;
                    });
            });
    }
}
