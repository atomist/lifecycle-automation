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

import { EventFired } from "@atomist/automation-client";
import { SlackMessage } from "@atomist/slack-messages";
import {
    Lifecycle,
    LifecycleHandler,
} from "../../../lifecycle/Lifecycle";
import { FooterNodeRenderer } from "../../../lifecycle/rendering/FooterNodeRenderer";
import * as graphql from "../../../typings/types";
import { LifecyclePreferences } from "../preferences";
import { RaisePrActionContributor } from "./rendering/BranchActionContributors";
import { BranchNodeRenderer } from "./rendering/BranchNodeRenderers";

export abstract class BranchLifecycle<R> extends LifecycleHandler<R> {

    protected prepareMessage(): Promise<SlackMessage> {
        return Promise.resolve({
            text: null,
            attachments: [],
        });
    }

    protected prepareLifecycle(event: EventFired<R>): Lifecycle[] {
        const [branches, repo, deleted] = this.extractNodes(event);

        if (branches != null) {
            return branches.map(branch => {
                const nodes = [];

                if (repo != null) {
                    nodes.push(repo);
                }

                nodes.push(branch);

                const configuration: Lifecycle = {
                    name: LifecyclePreferences.branch.id,
                    nodes,
                    renderers: [
                        new BranchNodeRenderer(),
                        new FooterNodeRenderer(node => node.hasOwnProperty("deleted"))],
                    contributors: [
                        new RaisePrActionContributor(),
                    ],
                    id: `branch_lifecycle/${repo.owner}/${repo.name}/${branch.name}`,
                    // ttl: (1000 * 60 * 60).toString(),
                    timestamp: Date.now().toString(),
                    channels: repo.channels.map(c => ({ teamId: c.team.id, name: c.name})),
                    post: deleted ? "update_only" : undefined,
                    extract: (type: string) => {
                        if (type === "repo") {
                            return repo;
                        } else if (type === "deleted") {
                            return deleted;
                        }
                        return null;
                    },
                };
                return configuration;
            });
        }
    }

    protected abstract extractNodes(event: EventFired<R>):
        [graphql.BranchToBranchLifecycle.Branch[],
            graphql.BranchFields.Repo,
            boolean];
}
