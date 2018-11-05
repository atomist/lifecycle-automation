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
    CardActionContributorWrapper,
    Lifecycle,
    LifecycleHandler,
} from "../../../lifecycle/Lifecycle";
import { AttachImagesNodeRenderer } from "../../../lifecycle/rendering/AttachImagesNodeRenderer";
import { CollaboratorCardNodeRenderer } from "../../../lifecycle/rendering/CollaboratorCardNodeRenderer";
import { ReferencedIssuesNodeRenderer } from "../../../lifecycle/rendering/ReferencedIssuesNodeRenderer";
import * as graphql from "../../../typings/types";
import { LifecyclePreferences } from "../preferences";
import {
    AssignActionContributor,
    AssignToMeActionContributor,
    CloseActionContributor,
    CommentActionContributor,
    DisplayMoreActionContributor,
    LabelActionContributor,
    MoveActionContributor,
    ReactionActionContributor,
    RelatedActionContributor,
    ReopenActionContributor,
} from "./rendering/IssueActionContributors";
import {
    CommentCardNodeRenderer,
    CorrelationsCardNodeRenderer,
    IssueCardNodeRenderer,
    ReferencedIssueCardNodeRenderer,
} from "./rendering/IssueCardNodeRenderers";
import {
    IssueNodeRenderer,
    MoreNodeRenderer,
} from "./rendering/IssueNodeRenderers";

export abstract class IssueCardLifecycleHandler<R> extends LifecycleHandler<R> {

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
            renderers: [
                new IssueCardNodeRenderer(),
                new CommentCardNodeRenderer(),
                new CorrelationsCardNodeRenderer(),
                new ReferencedIssueCardNodeRenderer(),
                new CollaboratorCardNodeRenderer(node => node.body != null),
            ],
            contributors: !repo.org.provider.private ? [
                new CardActionContributorWrapper(new CommentActionContributor()),
                new CardActionContributorWrapper(new ReactionActionContributor()),
                new CardActionContributorWrapper(new LabelActionContributor()),
                new CardActionContributorWrapper(new AssignToMeActionContributor("issue")),
                new CardActionContributorWrapper(new AssignActionContributor("issue")),
                new CardActionContributorWrapper(new CloseActionContributor()),
                new CardActionContributorWrapper(new ReopenActionContributor()),
            ] : [],
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

    protected abstract extractNodes(event: EventFired<R>):
        [graphql.IssueToIssueLifecycle.Issue,
            graphql.IssueFields.Repo,
            graphql.CommentToIssueLifecycle.Comment,
            string];
}

export abstract class IssueLifecycleHandler<R> extends LifecycleHandler<R> {

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
            renderers: [
                new IssueNodeRenderer(),
                new MoreNodeRenderer(),
                new ReferencedIssuesNodeRenderer(),
                new AttachImagesNodeRenderer(node => node.state === "open")],
            contributors: [
                new CommentActionContributor(),
                new LabelActionContributor(),
                new ReactionActionContributor(),
                new AssignToMeActionContributor(),
                new AssignActionContributor(),
                new MoveActionContributor(),
                new RelatedActionContributor(),
                new ReopenActionContributor(),
                new CloseActionContributor(),
                new DisplayMoreActionContributor(),
            ],
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

    protected abstract extractNodes(event: EventFired<R>):
        [graphql.IssueToIssueLifecycle.Issue, graphql.IssueFields.Repo, string];
}
