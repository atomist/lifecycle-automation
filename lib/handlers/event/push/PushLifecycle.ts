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
import * as _ from "lodash";
import {
    CardMessage,
    newCardMessage,
} from "../../../lifecycle/card";
import {
    Channel,
    Lifecycle,
    LifecycleHandler,
    Preferences,
} from "../../../lifecycle/Lifecycle";
import { Contributions } from "../../../machine/lifecycleSupport";
import * as graphql from "../../../typings/types";
import {
    PushToPushLifecycle,
    SdmGoalFields,
} from "../../../typings/types";
import { LifecyclePreferences } from "../preferences";
import { sortTagsByName } from "./rendering/PushActionContributors";

export class PushCardLifecycleHandler<R> extends LifecycleHandler<R> {

    constructor(private readonly extractNodes: (event: EventFired<R>) => PushToPushLifecycle.Push[],
                private readonly contributors: Contributions) {
        super();
    }

    protected async prepareMessage(lifecycle: Lifecycle, ctx: HandlerContext): Promise<CardMessage> {
        const msg = newCardMessage("push");
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
        const pushes = this.extractNodes(event);

        return pushes.filter(p => p && p.after).map(push => {
            const nodes: any[] = orderNodes(push);

            // Verify that there is at least a push and repo node
            if (!nodes) {
                logger.debug(`Lifecycle event is missing push, commits and/or repo node`);
                return null;
            }

            const configuration: Lifecycle = {
                name: LifecyclePreferences.push.id,
                nodes,
                renderers: this.contributors.renderers(push),
                contributors: this.contributors.actions(push),
                id: `push_lifecycle/${push.repo.owner}/${push.repo.name}/${push.branch}/${push.after.sha}`,
                timestamp: Date.now().toString(),
                channels: [{
                    name: "atomist:dashboard",
                    teamId: ctx.workspaceId,
                }],
                extract: (type: string) => {
                    if (type === "repo") {
                        return push.repo;
                    } else if (type === "push") {
                        return push;
                    } else if (type === "domains") {
                        return extractDomains(push).sort((d1, d2) => d1.name.localeCompare(d2.name));
                    } else if (type === "events") {
                        return null;
                    } else if (type === "goalSets") {
                        return (push.goalSets || []).sort((g1, g2) => g2.ts - g1.ts);
                    }
                    return null;
                },
            };
            return configuration;
        });
    }

    protected extractPreferences(event: EventFired<R>): { [teamId: string]: Preferences[] } {
        return {};
    }
}

export class PushLifecycleHandler<R> extends LifecycleHandler<R> {

    constructor(private readonly extractNodes: (event: EventFired<R>) => PushToPushLifecycle.Push[],
                private readonly _extractPreferences: (event: EventFired<R>) => { [teamId: string]: Preferences[] },
                private readonly contributors: Contributions) {
        super();
    }

    protected async prepareMessage(lifecycle: Lifecycle, ctx: HandlerContext): Promise<SlackMessage> {
        return Promise.resolve({
            text: null,
            attachments: [],
        });
    }

    protected prepareLifecycle(event: EventFired<R>): Lifecycle[] {
        const pushes = this.extractNodes(event);
        const preferences = this.extractPreferences(event);

        return pushes.filter(p => p && p.after).map(push => {
            const channels = this.filterChannels(push, preferences);
            const nodes: any[] = orderNodes(push);

            // Verify that there is at least a push and repo node
            if (!nodes) {
                logger.debug(`Lifecycle event is missing push, commits and/or repo node`);
                return null;
            }

            const mostCurrentGoal = _.maxBy(push.goals || [], "ts");

            const configuration: Lifecycle = {
                name: LifecyclePreferences.push.id,
                nodes,
                renderers: this.contributors.renderers(push),
                contributors: this.contributors.actions(push),
                id: createId(push),
                timestamp: mostCurrentGoal ? mostCurrentGoal.ts.toString() : Date.now().toString(),
                channels,
                extract: (type: string) => {
                    if (type === "repo") {
                        return push.repo;
                    } else if (type === "push") {
                        return push;
                    } else if (type === "domains") {
                        return extractDomains(push).sort((d1, d2) => d1.name.localeCompare(d2.name));
                    } else if (type === "goalSets") {
                        return (push.goalSets || []).sort((g1, g2) => g2.ts - g1.ts);
                    }
                    return null;
                },
            };
            return configuration;
        });
    }

    private filterChannels(push: graphql.PushToPushLifecycle.Push,
                           preferences: { [teamId: string]: Preferences[] } = {})
        : Channel[] {
        const channels = (_.get(push, "repo.channels") || [])
            .filter(c => c.name && c.name.length >= 1);
        if (!channels || channels.length === 0) {
            return [];
        }

        const channelNames: Channel[] = [];

        const repo = push.repo.name;
        const owner = push.repo.owner;
        const branch = push.branch;

        push.repo.channels.forEach(channel => {
            if (preferences[channel.team.id]) {
                const branchConfiguration =
                    preferences[channel.team.id].find(p => p.name === "lifecycle_branches");
                if (branchConfiguration) {
                    try {
                        const configuration = JSON.parse(branchConfiguration.value);
                        // Find the first match from the start of the configuration
                        const channelConfiguration = configuration.find(c => matches(c.name, channel.name));
                        if (channelConfiguration) {
                            // Now find the first matching repository configuration
                            const repoConfiguration = channelConfiguration.repositories
                                .find(r => matches(r.owner, owner) && matches(r.name, repo));
                            if (repoConfiguration) {
                                const include = repoConfiguration.include ?
                                    matches(repoConfiguration.include, branch) : null;
                                const exclude = repoConfiguration.exclude ?
                                    matches(repoConfiguration.exclude, branch) : null;
                                if (include === true && exclude !== false) {
                                    channelNames.push({ name: channel.name, teamId: channel.team.id });
                                } else if (include === null && exclude !== true) {
                                    channelNames.push({ name: channel.name, teamId: channel.team.id });
                                }
                            }
                        } else {
                            channelNames.push({ name: channel.name, teamId: channel.team.id });
                        }
                    } catch (err) {
                        logger.warn(
                            `Team preferences 'lifecycle_branches' are corrupt: '${branchConfiguration.value}'`);
                    }
                } else {
                    channelNames.push({ name: channel.name, teamId: channel.team.id });
                }
            } else {
                channelNames.push({ name: channel.name, teamId: channel.team.id });
            }
        });

        return channelNames;
    }

    protected extractPreferences(event: EventFired<R>): { [teamId: string]: Preferences[] } {
        return this._extractPreferences(event);
    }

}

function orderNodes(push: graphql.PushToPushLifecycle.Push): any[] {
    // Verify that there is at least a push and repo node
    if (!push || !push.repo || !push.commits) {
        logger.debug(`Lifecycle event is missing push and/or repo node`);
        return null;
    }

    const repo = push.repo;
    const nodes: any[] = [];
    if (repo != undefined) {
        nodes.push(repo);
    }

    // Push lifecycle starts with, drum roll, a Push
    if (push != undefined) {
        nodes.push(push);
        // Add all Tag nodes
        if (push.after != undefined && push.after.tags != undefined) {
            sortTagsByName(push.after.tags)
                .forEach(t => nodes.push(t));
        }
    }

    // Add Build nodes
    if (push.builds != undefined && push.builds.length > 0) {
        // Sort the builds in descending order; newest first
        push.builds.sort((b1, b2) => b2.timestamp.localeCompare(b1.timestamp))
            .forEach(b => nodes.push(b));

        // Add Workflow nodes
        _.uniqBy(push.builds.filter(b => b.workflow),
            b => b.workflow.id).forEach(b => nodes.push(b.workflow));
    }

    // Add Domain -> App nodes
    const domains = extractDomains(push).sort((d1, d2) => d1.name.localeCompare(d2.name));
    domains.forEach(d => nodes.push(d));

    // Add Goals nodes
    const goalSets: GoalSet[] = [];
    _.forEach(_.groupBy(push.goals, "goalSetId"),
        v => goalSets.push({ goals: v, goalSetId: v[0].goalSetId, ts: _.min(v.map(g => g.ts)) }));
    nodes.push(...goalSets.sort((g1, g2) => g2.ts - g1.ts));
    return nodes;
}

function extractDomains(push: graphql.PushToPushLifecycle.Push): Domain[] {
    const domains = {};
    push.commits.filter(c => c.apps).forEach(c => c.apps.forEach(a => {
        const domain = a.domain;
        if (domains[domain]) {
            domains[domain].push(a);
        } else {
            domains[domain] = [a];
        }
    }));

    const result: Domain[] = [];
    for (const domain in domains) {
        if (domains.hasOwnProperty(domain)) {
            result.push({ name: domain, apps: domains[domain] });
        }
    }

    return result;
}

function matches(pattern: string, target: string): boolean {
    const regexp = new RegExp(pattern, "g");
    const match = regexp.exec(target);
    return match != undefined && match.length > 0;
}

function createId(push: graphql.PushToPushLifecycle.Push): string {
    const id = `push_lifecycle/${push.repo.owner}/${push.repo.name}/${push.branch}/${push.after.sha}`;
    if (!!push.goalSets) {
        if (push.goalSets.length > 1) {
            return `${id}/${push.goalSets.length}`;
        } else if (push.goalSets.length === 1 && push.goalSets[0].provenance.name !== "SetGoalsOnPush") {
            return `${id}/${push.goalSets.length}`;
        }
    }
    return id;
}

export interface Domain {
    name: string;
    apps: graphql.PushFields.Apps[];
}

export interface GoalSet {
    goalSetId: string;
    goals: SdmGoalFields.Fragment[];
    ts: number;
}
