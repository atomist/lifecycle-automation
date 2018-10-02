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
import { replaceChatIdWithGitHubId } from "../../../util/helpers";
import * as github from "./gitHubApi";

@ConfigurableCommandHandler("Comment on a GitHub issue", {
    intent: ["comment issue", "comment github issue"],
    autoSubmit: true,
})
@Tags("github", "issue")
export class CommentGitHubIssue implements HandleCommand {

    @Parameter({ description: "issue number", pattern: /^.*$/ })
    public issue: number;

    @Parameter({ description: "Issue comment", pattern: /[\s\S]*/, control: "textarea" })
    public comment: string;

    @MappedParameter(MappedParameters.GitHubRepository)
    public repo: string;

    @MappedParameter(MappedParameters.GitHubOwner)
    public owner: string;

    @MappedParameter(MappedParameters.GitHubApiUrl)
    public apiUrl: string;

    @MappedParameter(MappedParameters.SlackTeam, false)
    public teamId: string;

    @Secret(Secrets.userToken("repo"))
    public githubToken: string;

    public handle(ctx: HandlerContext): Promise<HandlerResult> {

        return replaceChatIdWithGitHubId(this.comment, this.teamId, ctx)
            .then(body => {
                return github.api(this.githubToken, this.apiUrl).issues.createComment({
                    owner: this.owner,
                    repo: this.repo,
                    number: this.issue,
                    body,
                });
            })
            .then(() => Success)
            .catch(err => {
                return github.handleError("Comment Issue", err, ctx);
            });
    }
}
