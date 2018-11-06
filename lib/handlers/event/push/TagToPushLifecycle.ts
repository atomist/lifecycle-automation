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
    GraphQL,
    Tags,
} from "@atomist/automation-client";
import { EventHandler } from "@atomist/automation-client/lib/decorators";
import * as _ from "lodash";
import { Preferences } from "../../../lifecycle/Lifecycle";
import { chatTeamsToPreferences } from "../../../lifecycle/util";
import * as graphql from "../../../typings/types";
import {
    PushCardLifecycleHandler,
    PushLifecycleHandler,
} from "./PushLifecycle";

/**
 * Send a lifecycle message on Tag events.
 */
@EventHandler("Send a lifecycle message on Tag events",
    GraphQL.subscription("tagToPushLifecycle"))
@Tags("lifecycle", "push", "tag ")
export class TagToPushLifecycle extends PushLifecycleHandler<graphql.TagToPushLifecycle.Subscription> {

    protected extractNodes(event: EventFired<graphql.TagToPushLifecycle.Subscription>):
        [graphql.PushToPushLifecycle.Push[], number] {
        return [event.data.Tag[0].commit.pushes, Date.now()];
    }

    protected extractPreferences(
        event: EventFired<graphql.TagToPushLifecycle.Subscription>)
        : { [teamId: string]: Preferences[] } {
        return chatTeamsToPreferences(_.get(event, "data.Tag[0].commit.pushes[0].repo.org.team.chatTeams"));
    }
}

/**
 * Send a lifecycle card on Tag events.
 */
@EventHandler("Send a lifecycle card on Tag events",
    GraphQL.subscription("tagToPushLifecycle"))
@Tags("lifecycle", "push", "tag ")
export class TagToPushCardLifecycle extends PushCardLifecycleHandler<graphql.TagToPushLifecycle.Subscription> {

    protected extractNodes(event: EventFired<graphql.TagToPushLifecycle.Subscription>):
        graphql.PushToPushLifecycle.Push[] {
        return event.data.Tag[0].commit.pushes;
    }

    protected extractPreferences(
        event: EventFired<graphql.TagToPushLifecycle.Subscription>)
        : { [teamId: string]: Preferences[] } {
        return {};
    }
}
