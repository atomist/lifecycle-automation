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
 * Send a lifecycle message on Comment events.
 */
export function commentToPullRequestCommentLifecycle(contributions: Contributions)
    : EventHandlerRegistration<graphql.CommentToPullRequestCommentLifecycle.Subscription, LifecycleParametersDefinition> {
    return {
        name: "CommentToPullRequestCommentLifecycle",
        description: "Send an pr comment lifecycle message on Comment events",
        tags: ["lifecycle", "pr comment", "comment"],
        parameters: LifecycleParameters,
        subscription: GraphQL.subscription("commentToPullRequestCommentLifecycle"),
        listener: async (e, ctx, params) => {
            return lifecycle<graphql.CommentToPullRequestCommentLifecycle.Subscription>(
                e,
                params,
                ctx,
                () => new CommentLifecycleHandler(
                    e => {
                        return [e.data.Comment, null, _.get(e, "data.Comment[0].pullRequest"),
                            _.get(event, "data.Comment[0].pullRequest.repo"), false];
                    },
                    e => chatTeamsToPreferences(
                        _.get(e, "data.Comment[0].pullRequest.repo.org.team.chatTeams")),
                    contributions,
                ),
            );
        },
    };
}
