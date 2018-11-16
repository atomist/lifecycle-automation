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
import { PushLifecycleHandler } from "./PushLifecycle";

/**
 * Send a Push lifecycle message on SdmGoalDisplaytower  events.
 */
@EventHandler("Send a lifecycle message on SdmGoalDisplay events",
    GraphQL.subscription("sdmGoalDisplayToPushLifecycle"))
@Tags("lifecycle", "push", "sdm goal")
export class SdmGoalDisplayToPushLifecycle
    extends PushLifecycleHandler<graphql.SdmGoalDisplayToPushLifecycle.Subscription> {

    protected extractNodes(event: EventFired<graphql.SdmGoalDisplayToPushLifecycle.Subscription>):
        [graphql.PushToPushLifecycle.Push[], number] {
        return [[event.data.SdmGoalDisplay[0].push], Date.now()];
    }

    protected extractPreferences(
        event: EventFired<graphql.SdmGoalToPushLifecycle.Subscription>)
        : { [teamId: string]: Preferences[] } {
        return chatTeamsToPreferences(_.get(event, "data.SdmGoalDisplay[0].push.repo.org.team.chatTeams"));
    }
}
