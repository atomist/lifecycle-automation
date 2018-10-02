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
    HandleCommand,
    HandlerContext,
    HandlerResult,
    MappedParameter,
    MappedParameters,
    Parameter,
    Secret,
    Secrets,
    Success,
    Tags,
} from "@atomist/automation-client";
import {
    codeLine,
    url,
} from "@atomist/slack-messages";
import { success } from "../../../util/messages";
import * as github from "./gitHubApi";

@ConfigurableCommandHandler("Create a release of a repo on GitHub", {
    intent: [ "create release", "create github release" ],
    autoSubmit: true,
})
@Tags("github", "issue")
export class CreateGitHubRelease implements HandleCommand {

    @Parameter({ description: "tag to release", pattern: /^.*$/ })
    public tag: string;

    @Parameter({ description: "release message", pattern: /^.*$/ })
    public message: string;

    @MappedParameter(MappedParameters.GitHubRepository)
    public repo: string;

    @MappedParameter(MappedParameters.GitHubOwner)
    public owner: string;

    @MappedParameter(MappedParameters.GitHubApiUrl)
    public apiUrl: string;

    @MappedParameter(MappedParameters.GitHubUrl)
    public webUrl: string;

    @Secret(Secrets.userToken("repo"))
    public githubToken: string;

    public handle(ctx: HandlerContext): Promise<HandlerResult> {

        return github.api(this.githubToken, this.apiUrl).repos.createRelease({
                owner: this.owner,
                repo: this.repo,
                tag_name: this.tag,
                name: this.tag,
                body: this.message,
                draft: false,
                prerelease: false,
            })
            .then(() => {
                return ctx.messageClient.respond(success("Create Release",
                    `Successfully created a new release\n${url(
                        `${this.webUrl}/${this.owner}/${this.repo}/releases/tag/${this.tag}`,
                        codeLine(`${this.owner}/${this.repo}#${this.tag}`))}`));
            })
            .then(() => Success)
            .catch(err => {
                return github.handleError("Create Release", err, ctx);
            });

    }
}
