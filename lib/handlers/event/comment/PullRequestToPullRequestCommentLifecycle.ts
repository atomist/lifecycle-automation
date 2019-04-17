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

import { GraphQL } from "@atomist/automation-client";
import { EventHandlerRegistration } from "@atomist/sdm";
import * as _ from "lodash";
import {
    lifecycle,
    LifecycleParameters,
    LifecycleParametersDefinition,
} from "../../../lifecycle/Lifecycle";
import { chatTeamsToPreferences } from "../../../lifecycle/util";
import { Contributions } from "../../../machine/lifecycleSupport";
import * as graphql from "../../../typings/types";
import { CommentLifecycleHandler } from "./CommentLifecycle";

/**
 * Send a lifecycle message on PullRequest events.
 */
export function pullRequestToPullRequestCommentLifecycle(contributions: Contributions)
    : EventHandlerRegistration<graphql.PullRequestToPullRequestCommentLifecycle.Subscription, LifecycleParametersDefinition> {
    return {
        name: "PullRequestToPullRequestCommentLifecycle",
        description: "Send an pr comment lifecycle message on PullRequest events",
        tags: ["lifecycle", "pr comment", "comment"],
        parameters: LifecycleParameters,
        subscription: GraphQL.subscription("pullRequestToPullRequestCommentLifecycle"),
        listener: async (e, ctx, params) => {
            return lifecycle<graphql.PullRequestToPullRequestCommentLifecycle.Subscription>(
                e,
                params,
                ctx,
                () => new CommentLifecycleHandler(
                    e => {
                        const pr = e.data.PullRequest[0];
                        if (pr) {
                            return [pr.comments.sort((c1, c2) =>
                                c1.timestamp.localeCompare(c2.timestamp)), null, pr, _.get(pr, "repo"), true];
                        } else {
                            return [null, null, null, null, true];
                        }
                    },
                    e => chatTeamsToPreferences(
                        _.get(e, "data.PullRequest[0].repo.org.team.chatTeams")),
                    contributions,
                ),
            );
        },
    };
}
