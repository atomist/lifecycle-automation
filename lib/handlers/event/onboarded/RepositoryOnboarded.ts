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
    EventFired,
    failure,
    HandlerContext,
    HandlerResult,
    Secret,
    Secrets,
    success,
    Tags,
} from "@atomist/automation-client";
import { EventHandler } from "@atomist/automation-client/lib/decorators";
import * as GraphQL from "@atomist/automation-client/lib/graph/graphQL";
import { HandleEvent } from "@atomist/automation-client/lib/HandleEvent";
import * as _ from "lodash";
import * as graphql from "../../../typings/types";
import { IssueToIssueCardLifecycle } from "../issue/IssueToIssueLifecycle";
import { PullRequestToPullRequestCardLifecycle } from "../pullrequest/PullRequestToPullRequestLifecycle";
import { PushToPushCardLifecycle } from "../push/PushToPushLifecycle";

@EventHandler("Send a Push lifecycle card when a new repo has finished onboarding",
    GraphQL.subscription("repoOnboarded"))
@Tags("enrollment")
export class RepositoryOnboarded implements HandleEvent<graphql.RepoOnboarded.Subscription> {

    @Secret(Secrets.OrgToken)
    public orgToken: string;

    public async handle(event: EventFired<graphql.RepoOnboarded.Subscription>,
                        ctx: HandlerContext): Promise<HandlerResult> {
        const repo = event.data.RepoOnboarded[0].repo;
        const promises: Array<Promise<HandlerResult>> = [];

        const commitResult = await ctx.graphClient.query<graphql.LastCommitOnBranch.Query,
            graphql.LastCommitOnBranch.Variables>({
                name: "lastCommitOnBranch",
                variables: {
                    name: repo.name,
                    owner: repo.owner,
                    branch: repo.defaultBranch,
                },
            });
        const commit = _.get(commitResult, "Repo[0].branches[0].commit") as graphql.LastCommitOnBranch.Commit;
        if (commit) {
            promises.push(processCommit(commit, repo, event, ctx, this.orgToken));
        }

        const issueResult = await ctx.graphClient.query<graphql.LastIssueOnRepo.Query,
            graphql.LastIssueOnRepo.Variables>({
                name: "lastIssueOnRepo",
                variables: {
                    name: repo.name,
                    owner: repo.owner,
                },
            });
        const issues = _.get(issueResult, "Repo[0].issue");
        if (issues) {
            promises.push(...issues.map(i => processIssue(i, event, ctx, this.orgToken)));
        }

        const prResult = await ctx.graphClient.query<graphql.LastPullRequestOnRepo.Query,
            graphql.LastPullRequestOnRepo.Variables>({
                name: "lastPullRequestOnRepo",
                variables: {
                    name: repo.name,
                    owner: repo.owner,
                },
            });
        const prs = _.get(prResult, "Repo[0].pullRequest");
        if (prs) {
            promises.push(...prs.map(pr => processPullRequest(pr, event, ctx, this.orgToken)));
        }

        return Promise.all(promises)
            .then(success, failure);
    }
}

function processCommit(commit: graphql.LastCommitOnBranch.Commit,
                       repo: graphql.RepoOnboarded.Repo,
                       event: EventFired<graphql.RepoOnboarded.Subscription>,
                       ctx: HandlerContext,
                       orgToken: string): Promise<HandlerResult> {
    const push: graphql.PushToPushLifecycle.Push = {
        after: commit,
        commits: [commit],
        builds: [],
        branch: repo.defaultBranch,
        repo,
        timestamp: commit.timestamp,
    };

    const handler = new PushToPushCardLifecycle();
    handler.orgToken = orgToken;

    return handler.handle(
        {
            data: {
                Push: [push],
            },
            extensions: {
                ...event.extensions,
                operationName: "PushToPushCardLifecycle",
            },
            secrets: {
                ...event.secrets,
            },
        },
        ctx);
}

function processIssue(issue: graphql.LastIssueOnRepo.Issue,
                      event: EventFired<graphql.RepoOnboarded.Subscription>,
                      ctx: HandlerContext,
                      orgToken: string): Promise<HandlerResult> {

    const handler = new IssueToIssueCardLifecycle();
    handler.orgToken = orgToken;

    return handler.handle(
        {
            data: {
                Issue: [issue],
            },
            extensions: {
                ...event.extensions,
                operationName: "IssueToIssueCardLifecycle",
            },
            secrets: {
                ...event.secrets,
            },
        },
        ctx);
}

function processPullRequest(pr: graphql.LastPullRequestOnRepo.PullRequest,
                            event: EventFired<graphql.RepoOnboarded.Subscription>,
                            ctx: HandlerContext,
                            orgToken: string): Promise<HandlerResult> {

    const handler = new PullRequestToPullRequestCardLifecycle();
    handler.orgToken = orgToken;

    return handler.handle(
        {
            data: {
                PullRequest: [pr],
            },
            extensions: {
                ...event.extensions,
                operationName: "PullRequestToPullRequestCardLifecycle",
            },
            secrets: {
                ...event.secrets,
            },
        },
        ctx);
}
