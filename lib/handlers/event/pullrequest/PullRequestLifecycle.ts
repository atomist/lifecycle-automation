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
    EventFired,
    HandlerContext,
    logger,
} from "@atomist/automation-client";
import { SlackMessage } from "@atomist/slack-messages";
import {
    CardMessage,
    newCardMessage,
} from "../../../lifecycle/card";
import {
    Lifecycle,
    LifecycleHandler,
    Preferences,
} from "../../../lifecycle/Lifecycle";
import { Contributions } from "../../../machine/lifecycleSupport";
import * as graphql from "../../../typings/types";
import { LifecyclePreferences } from "../preferences";

export class PullRequestCardLifecycleHandler<R> extends LifecycleHandler<R> {

    constructor(private readonly extractNodes: (event: EventFired<R>) => [graphql.PullRequestToPullRequestLifecycle.PullRequest,
                    graphql.PullRequestFields.Repo,
                    string,
                    boolean],
                private readonly contributors: Contributions) {
        super();
    }

    protected prepareMessage(lifecycle: Lifecycle): Promise<CardMessage> {
        const msg = newCardMessage("pullrequest");
        const repo = lifecycle.extract("repo");
        msg.repository = {
            owner: repo.owner,
            name: repo.name,
            slug: `${repo.owner}/${repo.name}`,
        };
        msg.ts = +lifecycle.timestamp;
        return Promise.resolve(msg);
    }

    protected prepareLifecycle(event: EventFired<R>, ctx: HandlerContext): Lifecycle[] {
        const nodes = [];
        const [pullrequest, repo, timestamp, updateOnly] = this.extractNodes(event);

        if (repo != null) {
            nodes.push(repo);
        }

        // PullRequest lifecycle starts with, drum roll, a PullRequest
        if (pullrequest != null) {
            nodes.push(pullrequest);
        }

        // Verify that there is at least a pullrequest and repo node
        if (pullrequest == null || repo == null) {
            logger.debug(`Lifecycle event is missing pullrequest and/or repo node`);
            return null;
        } else if (pullrequest.merged && !pullrequest.merger) {
            logger.debug(`Lifecycle event is missing merger for merged pullrequest`);
            return null;
        }

        const configuration: Lifecycle = {
            name: LifecyclePreferences.pull_request.id,
            nodes,
            renderers: this.contributors.renderers(repo),
            contributors: this.contributors.actions(repo),
            id: `pullrequest_lifecycle/${repo.owner}/${repo.name}/${pullrequest.number}`,
            timestamp,
            // ttl: (1000 * 60 * 60 * 8).toString(),
            post: updateOnly ? "update_only" : undefined,
            channels: [{
                name: "atomist:dashboard",
                teamId: ctx.workspaceId,
            }],
            extract: (type: string) => {
                if (type === "repo") {
                    return pullrequest.repo;
                }
                return null;
            },
        };

        return [configuration];
    }

    protected extractPreferences(event: EventFired<R>): { [teamId: string]: Preferences[] } {
        return {};
    }
}

export class PullRequestLifecycleHandler<R> extends LifecycleHandler<R> {

    constructor(private readonly extractNodes: (event: EventFired<R>) => [graphql.PullRequestToPullRequestLifecycle.PullRequest,
                    graphql.PullRequestFields.Repo,
                    string,
                    boolean],
                private readonly _extractPreferences: (event: EventFired<R>) => { [teamId: string]: Preferences[] },
                private readonly contributors: Contributions) {
        super();
    }

    protected prepareMessage(): Promise<SlackMessage> {
        return Promise.resolve({
            text: null,
            attachments: [],
        });
    }

    protected prepareLifecycle(event: EventFired<R>): Lifecycle[] {
        const nodes = [];
        const [pullrequest, repo, timestamp, updateOnly] = this.extractNodes(event);

        if (repo != null) {
            nodes.push(repo);
        }

        // PullRequest lifecycle starts with, drum roll, a PullRequest
        if (pullrequest != null) {
            nodes.push(pullrequest);
        }

        // Verify that there is at least a pullrequest and repo node
        if (pullrequest == null || repo == null) {
            logger.debug(`Lifecycle event is missing pullrequest and/or repo node`);
            return null;
        } else if (pullrequest.merged && !pullrequest.merger) {
            logger.debug(`Lifecycle event is missing merger for merged pullrequest`);
            return null;
        }

        const configuration: Lifecycle = {
            name: LifecyclePreferences.pull_request.id,
            nodes,
            renderers: this.contributors.renderers(repo),
            contributors: this.contributors.actions(repo),
            id: `pullrequest_lifecycle/${repo.owner}/${repo.name}/${pullrequest.number}`,
            timestamp,
            // ttl: (1000 * 60 * 60 * 8).toString(),
            post: updateOnly ? "update_only" : undefined,
            channels: pullrequest.repo.channels.map(c => ({ name: c.name, teamId: c.team.id })),
            extract: (type: string) => {
                if (type === "repo") {
                    return pullrequest.repo;
                }
                return null;
            },
        };

        return [configuration];
    }

    protected extractPreferences(event: EventFired<R>): { [teamId: string]: Preferences[] } {
        return this._extractPreferences(event);
    }

}
