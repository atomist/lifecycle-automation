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
import { isGitHub } from "../../../util/helpers";
import { LifecyclePreferences } from "../preferences";
import {
    ApproveActionContributor,
    AssignReviewerActionContributor,
    AutoMergeActionContributor,
    CommentActionContributor,
    DeleteActionContributor,
    MergeActionContributor,
    ThumbsUpActionContributor,
} from "./rendering/PullRequestActionContributors";
import {
    BuildCardNodeRenderer,
    CommitCardNodeRenderer,
    PullRequestCardNodeRenderer,
    ReviewCardNodeRenderer,
    StatusCardNodeRenderer,
} from "./rendering/PullRequestCardNodeRenderers";
import {
    BuildNodeRenderer,
    CommitNodeRenderer,
    PullRequestNodeRenderer,
    ReviewNodeRenderer,
    StatusNodeRenderer,
} from "./rendering/PullRequestNodeRenderers";

export abstract class PullRequestCardLifecycleHandler<R> extends LifecycleHandler<R> {

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
            renderers: [
                new PullRequestCardNodeRenderer(),
                new CommitCardNodeRenderer(),
                new BuildCardNodeRenderer(),
                new StatusCardNodeRenderer(),
                new ReviewCardNodeRenderer(),
                new CollaboratorCardNodeRenderer(node => node.baseBranchName != null),
            ],
            contributors: !repo.org.provider.private ? [
                new CardActionContributorWrapper(new MergeActionContributor()),
                new CardActionContributorWrapper(new AssignReviewerActionContributor()),
                new CardActionContributorWrapper(new AutoMergeActionContributor()),
                new CardActionContributorWrapper(new CommentActionContributor()),
                new CardActionContributorWrapper(new ThumbsUpActionContributor()),
                new CardActionContributorWrapper(new ApproveActionContributor()),
                new CardActionContributorWrapper(new DeleteActionContributor()),
            ] : [],
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

    protected abstract extractNodes(event: EventFired<R>):
        [graphql.PullRequestToPullRequestLifecycle.PullRequest,
            graphql.PullRequestFields.Repo,
            string,
            boolean];
}

export abstract class PullRequestLifecycleHandler<R> extends LifecycleHandler<R> {

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
            renderers: [
                new PullRequestNodeRenderer(),
                new CommitNodeRenderer(),
                new BuildNodeRenderer(),
                new StatusNodeRenderer(),
                new ReviewNodeRenderer(),
                new ReferencedIssuesNodeRenderer(),
                new AttachImagesNodeRenderer(node => node.state === "open")],
            contributors: !repo.org.provider.private ? [
                new MergeActionContributor(),
                new AssignReviewerActionContributor(),
                new AutoMergeActionContributor(),
                new CommentActionContributor(),
                new ThumbsUpActionContributor(),
                new ApproveActionContributor(),
                new DeleteActionContributor(),
            ] : [],
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

    protected abstract extractNodes(event: EventFired<R>):
        [graphql.PullRequestToPullRequestLifecycle.PullRequest,
            graphql.PullRequestFields.Repo,
            string,
            boolean];
}
