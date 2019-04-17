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
    failure,
    HandlerContext,
    HandlerResult,
    MappedParameter,
    MappedParameters,
    Parameter,
    Secret,
    Secrets,
    Tags,
} from "@atomist/automation-client";
import { ConfigurableCommandHandler } from "@atomist/automation-client/lib/decorators";
import { HandleCommand } from "@atomist/automation-client/lib/HandleCommand";
import * as _ from "lodash";
import { Lifecycle } from "../../../lifecycle/Lifecycle";
import { chatTeamsToPreferences } from "../../../lifecycle/util";
import { DefaultLifecycleOptions } from "../../../machine/lifecycleSupport";
import * as graphql from "../../../typings/types";
import { PullRequestLifecycleHandler } from "../../event/pullrequest/PullRequestLifecycle";
import { pullRequestToPullRequestLifecycle } from "../../event/pullrequest/PullRequestToPullRequestLifecycle";
import * as github from "./gitHubApi";

@ConfigurableCommandHandler("Display a pull request on GitHub", {
    intent: ["show pull request", "show pr", "show github pr", "show github pull request"],
    autoSubmit: true,
})
@Tags("github", "pr")
export class DisplayGitHubPullRequest implements HandleCommand {

    @Parameter({ description: "PR number", pattern: /^.*$/ })
    public issue: string;

    @MappedParameter(MappedParameters.GitHubRepository)
    public repo: string;

    @MappedParameter(MappedParameters.GitHubOwner)
    public owner: string;

    @MappedParameter(MappedParameters.GitHubApiUrl)
    public apiUrl: string;

    @MappedParameter(MappedParameters.SlackChannelName)
    public channelName: string;

    @Secret(Secrets.userToken("repo"))
    public githubToken: string;

    public handle(ctx: HandlerContext): Promise<HandlerResult> {
        return ctx.graphClient.query<graphql.PullRequest.Query, graphql.PullRequest.Variables>({
            name: "pullRequest",
            variables: {
                teamId: ctx.workspaceId,
                repoName: this.repo,
                prName: this.issue,
                orgOwner: this.owner,
            },
        })
            .then(result => {
                const prs: graphql.PullRequest.PullRequest[] =
                    _.get(result, "ChatTeam[0].team.orgs[0].repo[0].pullRequest");
                const handler = pullRequestToPullRequestLifecycle(
                    DefaultLifecycleOptions.pullRequest.chat,
                    () => new ResponsePullRequestToPullRequestLifecycle()).listener;

                // Hopefully we can find the pull request in Neo
                if (prs && prs.length > 0) {
                    return handler({
                        data: { PullRequest: prs as any },
                        extensions: { operationName: "DisplayGitHubPullRequest" },
                    }, ctx, { orgToken: this.githubToken });
                }
            })
            .catch(failure);
    }
}

class ResponsePullRequestToPullRequestLifecycle
    extends PullRequestLifecycleHandler<graphql.PullRequestToPullRequestLifecycle.Subscription> {

    constructor() {
        super(e => [e.data.PullRequest[0], e.data.PullRequest[0].repo, Date.now().toString(), false],
            e => chatTeamsToPreferences(
                _.get(e, "data.PullRequest[0].repo.org.team.chatTeams")),
            DefaultLifecycleOptions.pullRequest.chat);
    }

    protected processLifecycle(lifecycle: Lifecycle): Lifecycle {
        lifecycle.post = "always";
        return lifecycle;
    }
}
