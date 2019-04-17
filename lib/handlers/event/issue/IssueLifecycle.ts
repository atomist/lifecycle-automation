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

export class IssueCardLifecycleHandler<R> extends LifecycleHandler<R> {

    constructor(private readonly extractNodes: (event: EventFired<R>) => [graphql.IssueToIssueLifecycle.Issue,
                    graphql.IssueFields.Repo,
                    graphql.CommentToIssueLifecycle.Comment,
                    string],
                private readonly contributors: Contributions) {
        super();
    }

    protected prepareMessage(lifecycle: Lifecycle): Promise<CardMessage> {
        const msg = newCardMessage("issue");
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
        const nodes: any[] = [];
        const [issue, repo, comment, timestamp] = this.extractNodes(event);

        if (issue != null) {
            nodes.push(issue);
        }

        if (comment != null) {
            nodes.push(comment);
        }

        // Verify that there is at least a issue and repo node
        if (issue == null) {
            logger.debug(`Lifecycle event is missing issue and/or repo node`);
            return null;
        }

        const configuration: Lifecycle = {
            name: LifecyclePreferences.issue.id,
            nodes,
            renderers: this.contributors.renderers(repo),
            contributors: this.contributors.actions(repo),
            id: `issue_lifecycle/${repo.owner}/${repo.name}/${issue.number}`,
            timestamp,
            channels: [{
                name: "atomist:dashboard",
                teamId: ctx.workspaceId,
            }],
            extract: (type: string) => {
                if (type === "repo") {
                    return repo;
                } else if (type === "comment") {
                    return comment;
                }
                return null;
            },
        };

        return [configuration];
    }

    protected processLifecycle(lifecycle: Lifecycle, store: Map<string, any>): Lifecycle {
        store.set("show_more", true);
        return lifecycle;
    }

    protected extractPreferences(event: EventFired<R>): { [teamId: string]: Preferences[] } {
        return {};
    }
}

export class IssueLifecycleHandler<R> extends LifecycleHandler<R> {

    constructor(private readonly extractNodes: (event: EventFired<R>) => [graphql.IssueToIssueLifecycle.Issue, graphql.IssueFields.Repo, string],
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
        const nodes: any[] = [];
        const [issue, repo, timestamp] = this.extractNodes(event);

        if (issue != null) {
            nodes.push(issue);
        }

        // Verify that there is at least a issue and repo node
        if (issue == null) {
            logger.debug(`Lifecycle event is missing issue and/or repo node`);
            return null;
        }

        const configuration: Lifecycle = {
            name: LifecyclePreferences.issue.id,
            nodes,
            renderers: this.contributors.renderers(repo),
            contributors: this.contributors.actions(repo),
            id: `issue_lifecycle/${repo.owner}/${repo.name}/${issue.number}`,
            timestamp,
            channels: repo.channels.map(c => ({ name: c.name, teamId: c.team.id })),
            extract: (type: string) => {
                if (type === "repo") {
                    return repo;
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
