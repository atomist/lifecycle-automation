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
    EventHandler,
    Tags,
} from "@atomist/automation-client";
import { subscription } from "@atomist/automation-client/graph/graphQL";
import * as _ from "lodash";
import { Preferences } from "../../../lifecycle/Lifecycle";
import { chatTeamsToPreferences } from "../../../lifecycle/util";
import * as graphql from "../../../typings/types";
import {
    PushCardLifecycleHandler,
    PushLifecycleHandler,
} from "./PushLifecycle";

/**
 * Send a lifecycle message on K8Pod events.
 */
@EventHandler("Send a lifecycle message on K8Pod events",
    subscription("k8PodToPushLifecycle"))
@Tags("lifecycle", "push", "k8pod")
export class K8PodToPushLifecycle extends PushLifecycleHandler<graphql.K8PodToPushLifecycle.Subscription> {

    protected extractNodes(event: EventFired<graphql.K8PodToPushLifecycle.Subscription>):
        graphql.K8PodToPushLifecycle.Pushes[] {

        const pushes = [];
        event.data.K8Pod[0].images
            .filter(i => i.commits && i.commits.length > 0)
            .forEach(i => pushes.push(...i.commits[0].pushes));
        return pushes;
    }

    protected extractPreferences(
        event: EventFired<graphql.K8PodToPushLifecycle.Subscription>)
        : { [teamId: string]: Preferences[] } {
        return chatTeamsToPreferences(
            _.get(event, "data.K8Pod[0].images[0].commits[0].pushes[0].repo.org.team.chatTeams"));
    }
}

/**
 * Send a lifecycle card on K8Pod events.
 */
@EventHandler("Send a lifecycle card on K8Pod events",
    subscription("k8PodToPushLifecycle"))
@Tags("lifecycle", "push", "k8pod")
export class K8PodToPushCardLifecycle extends PushCardLifecycleHandler<graphql.K8PodToPushLifecycle.Subscription> {

    protected extractNodes(event: EventFired<graphql.K8PodToPushLifecycle.Subscription>):
        graphql.K8PodToPushLifecycle.Pushes[] {

        const pushes = [];
        event.data.K8Pod[0].images
            .filter(i => i.commits && i.commits.length > 0)
            .forEach(i => pushes.push(...i.commits[0].pushes));
        return pushes;
    }

    protected extractPreferences(
        event: EventFired<graphql.K8PodToPushLifecycle.Subscription>)
        : { [teamId: string]: Preferences[] } {
        return {};
    }
}
