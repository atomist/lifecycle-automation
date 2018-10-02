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
import * as github from "./gitHubApi";

@ConfigurableCommandHandler("Add label to or remove a label from a GitHub issue", {
    intent: [ "toggle issue label", "toggle github issue label" ],
    autoSubmit: true,
})
@Tags("github", "issue")
export class ToggleLabelGitHubIssue implements HandleCommand {

    @Parameter({ description: "issue number", pattern: /^.*$/ })
    public issue: number;

    @Parameter({ description: "a label to add to or remove from an issue", pattern: /^.*$/ })
    public label: string;

    @MappedParameter(MappedParameters.GitHubRepository)
    public repo: string;

    @MappedParameter(MappedParameters.GitHubOwner)
    public owner: string;

    @MappedParameter(MappedParameters.GitHubApiUrl)
    public apiUrl: string;

    @Secret(Secrets.userToken("repo"))
    public githubToken: string;

    public handle(ctx: HandlerContext): Promise<HandlerResult> {
        return github.api(this.githubToken, this.apiUrl).issues.get({
            owner: this.owner,
            repo: this.repo,
            number: this.issue,
        })
            .then(issue => {
                const labels = issue.data.labels ? issue.data.labels.map(l => l.name) : [];
                if (labels.indexOf(this.label) >= 0) {
                    return labels.filter(l => l !== this.label);
                } else {
                    labels.push(this.label);
                    return labels;
                }
            })
            .then(labels => {
                return github.api(this.githubToken, this.apiUrl).issues.edit({
                    owner: this.owner,
                    repo: this.repo,
                    number: this.issue,
                    labels,
                });
            })
            .then(() => Success)
            .catch(err => {
                return github.handleError("Label Issue", err, ctx);
            });
    }
}
