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
    Tags,
} from "@atomist/automation-client";
import { EventHandler } from "@atomist/automation-client/lib/decorators";
import * as GraphQL from "@atomist/automation-client/lib/graph/graphQL";
import * as _ from "lodash";
import { Preferences } from "../../../lifecycle/Lifecycle";
import { chatTeamsToPreferences } from "../../../lifecycle/util";
import * as graphql from "../../../typings/types";
import {
    PushCardLifecycleHandler,
    PushLifecycleHandler,
} from "./PushLifecycle";

/**
 * Send a lifecycle message on Application events.
 */
@EventHandler("Send a lifecycle message on Application events",
    GraphQL.subscription("applicationToPushLifecycle"))
@Tags("lifecycle", "push", "application")
export class ApplicationToPushLifecycle extends PushLifecycleHandler<graphql.ApplicationToPushLifecycle.Subscription> {

    protected extractNodes(event: EventFired<graphql.ApplicationToPushLifecycle.Subscription>):
        graphql.PushToPushLifecycle.Push[] {

        const pushes = [];
        event.data.Application[0].commits.forEach(c => pushes.push(...c.pushes));
        return pushes;
    }

    protected extractPreferences(
        event: EventFired<graphql.ApplicationToPushLifecycle.Subscription>)
        : { [teamId: string]: Preferences[] } {
        return chatTeamsToPreferences(
            _.get(event, "data.Application[0].commits[0].pushes[0].repo.org.team.chatTeams"));
    }
}

/**
 * Send a lifecycle card on Application events.
 */
@EventHandler("Send a lifecycle card on Application events",
    GraphQL. subscription("applicationToPushLifecycle"))
@Tags("lifecycle", "push", "application")
export class ApplicationToPushCardLifecycle
    extends PushCardLifecycleHandler<graphql.ApplicationToPushLifecycle.Subscription> {

    protected extractNodes(event: EventFired<graphql.ApplicationToPushLifecycle.Subscription>):
        graphql.PushToPushLifecycle.Push[] {

        const pushes = [];
        event.data.Application[0].commits.forEach(c => pushes.push(...c.pushes));
        return pushes;
    }

    protected extractPreferences(
        event: EventFired<graphql.ApplicationToPushLifecycle.Subscription>)
        : { [teamId: string]: Preferences[] } {
        return {};
    }
}
