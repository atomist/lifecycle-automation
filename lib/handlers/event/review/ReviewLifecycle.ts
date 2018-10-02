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
    logger,
} from "@atomist/automation-client";
import { SlackMessage } from "@atomist/slack-messages";
import {
    Lifecycle,
    LifecycleHandler,
} from "../../../lifecycle/Lifecycle";
import { FooterNodeRenderer } from "../../../lifecycle/rendering/FooterNodeRenderer";
import * as graphql from "../../../typings/types";
import { LifecyclePreferences } from "../preferences";
import { CommentActionContributor } from "./rendering/ReviewActionContributors";
import {
    ReviewDetailNodeRenderer,
    ReviewNodeRenderer,
} from "./rendering/ReviewNodeRenderers";

export abstract class ReviewLifecycleHandler<R> extends LifecycleHandler<R> {

    protected prepareMessage(): Promise<SlackMessage> {
        return Promise.resolve({
            text: null,
            attachments: [],
        });
    }

    protected prepareLifecycle(event: EventFired<R>): Lifecycle[] {
        const [reviews, timestamp] = this.extractNodes(event);

        if (reviews) {
            return reviews.map(review => {
                const nodes = [];
                let repo;
                if (review && review.pullRequest && review.pullRequest.repo) {
                    repo = review.pullRequest.repo;
                    nodes.push(review.pullRequest);
                    nodes.push(repo);
                }

                // PullRequest lifecycle starts with, drum roll, a PullRequest
                if (review != null) {
                    nodes.push(review);
                }

                // Verify that there is at least a pullrequest and repo node
                if (review == null || review.pullRequest == null) {
                    logger.debug(`Lifecycle event is missing review and/or repo node`);
                    return null;
                }

                const configuration: Lifecycle = {
                    name: LifecyclePreferences.review.id,
                    nodes,
                    renderers: [
                        new ReviewNodeRenderer(),
                        new ReviewDetailNodeRenderer(),
                        new FooterNodeRenderer((node: any) => node.pullRequest)],
                    contributors: [
                        new CommentActionContributor(),
                    ],
                    id: `review_lifecycle/${repo.owner}/${repo.name}/${review.pullRequest.number}/${review._id}`,
                    timestamp,
                    // #47 remove issue rewrite
                    // ttl: (1000 * 60 * 60 * 8).toString(),
                    channels: repo.channels.map(c => ({ name: c.name, teamId: c.team.id })),
                    extract: (type: string) => {
                        if (type === "repo") {
                            return repo;
                        } else if (type === "pullrequest") {
                            return review.pullRequest;
                        }
                        return null;
                    },
                };
                return configuration;
            });
        }

    }

    protected abstract extractNodes(event: EventFired<R>): [graphql.ReviewToReviewLifecycle.Review[], string];
}
