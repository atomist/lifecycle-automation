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
import { IssueLifecycleHandler } from "../../event/issue/IssueLifecycle";
import { issueToIssueLifecycle } from "../../event/issue/IssueToIssueLifecycle";
import * as github from "./gitHubApi";

@ConfigurableCommandHandler("Display an issue on GitHub", {
    intent: ["show issue", "show github issue"],
    autoSubmit: true,
})
@Tags("github", "issue")
export class DisplayGitHubIssue implements HandleCommand {

    @Parameter({ description: "issue number", pattern: /^.*$/ })
    public issue: number;

    @Parameter({ description: "show more", required: false, displayable: false })
    public showMore: string;

    @MappedParameter(MappedParameters.GitHubRepository)
    public repo: string;

    @MappedParameter(MappedParameters.GitHubOwner)
    public owner: string;

    @MappedParameter(MappedParameters.GitHubApiUrl)
    public apiUrl: string;

    @MappedParameter(MappedParameters.SlackChannelName)
    public channelName: string;

    @MappedParameter(MappedParameters.SlackTeam)
    public teamId: string;

    @Secret(Secrets.userToken("repo"))
    public githubToken: string;

    public handle(ctx: HandlerContext): Promise<HandlerResult> {
        return ctx.graphClient.query<graphql.Issue.Query, graphql.Issue.Variables>({
            name: "issue",
            variables: {
                teamId: ctx.workspaceId,
                repoName: this.repo,
                issueName: this.issue.toString(),
                orgOwner: this.owner,
            },
        })
            .then(result => {
                const issues: graphql.Issue.Issue[] =
                    _.cloneDeep(_.get(result, "ChatTeam[0].team.orgs[0].repo[0].issue"));
                const handler = issueToIssueLifecycle(DefaultLifecycleOptions.issue.chat,
                    () => new ResponseIssueToIssueLifecycle(this.showMore)).listener;

                const channels = [{
                    name: this.channelName,
                    team: {
                        id: this.teamId,
                    },
                }];

                // Hopefully we can find the issue in Neo
                if (issues && issues.length > 0) {
                    // Overwrite the channels to send this message to
                    issues.forEach(i => i.repo.channels = channels);

                    return handler({
                        data: { Issue: issues as any },
                        extensions: { operationName: "DisplayGitHubIssue" },
                    }, ctx, { orgToken: this.githubToken });
                } else {
                    // If not in Neo, let's get if from GitHub
                    return github.api(this.githubToken, this.apiUrl).issues.get({
                        number: this.issue,
                        repo: this.repo,
                        owner: this.owner,
                    })
                        .then(gis => {
                            const gi = gis.data;
                            const issue: graphql.Issue.Issue = {
                                repo: {
                                    name: this.repo,
                                    owner: this.owner,
                                    channels,
                                },
                                name: this.issue.toString(),
                                number: this.issue,
                                title: gi.title,
                                body: gi.body,
                                state: gi.state,
                                labels: gi.labels.map(l => ({ name: l.name })) || [],
                                createdAt: gi.created_at,
                                updatedAt: gi.updated_at,
                                closedAt: gi.closed_at,
                                assignees: gi.assignees.map(a => ({ login: a.login })) || [],
                                openedBy: gi.user.login,
                                resolvingCommits: [],
                            };
                            return handler({
                                data: { Issue: [issue] as any },
                                extensions: { operationName: "DisplayGitHubIssue" },
                            }, ctx, { orgToken: this.githubToken });
                        });
                }
            })
            .catch(failure);
    }
}

class ResponseIssueToIssueLifecycle extends IssueLifecycleHandler<graphql.IssueToIssueLifecycle.Subscription> {

    constructor(private showMore: string) {
        super(e => {
                const issue = e.data.Issue[0];
                const repo = e.data.Issue[0].repo;
                return [issue, repo, Date.now().toString()];
            },
            e => chatTeamsToPreferences(_.get(e, "data.Issue[0].repo.org.team.chatTeams")),
            DefaultLifecycleOptions.issue.chat);
    }

    protected processLifecycle(lifecycle: Lifecycle, store: Map<string, any>): Lifecycle {
        if (this.showMore === "more_+" || this.showMore === "assign_+") {
            store.set("show_more", true);
        } else if (this.showMore === "more_-" || this.showMore === "assign_-") {
            // don't do anything
        } else {
            lifecycle.post = "always";
        }

        return lifecycle;
    }
}
