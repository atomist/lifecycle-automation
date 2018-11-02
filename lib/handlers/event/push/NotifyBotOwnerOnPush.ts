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
import { ChatTeam } from "../../../lifecycle/Lifecycle";
import * as graphql from "../../../typings/types";
import { AbstractNotifyBotOwner } from "../AbstractNotifyBotOwner";

@EventHandler("Notify the bot owner of GitHub activity in Slack", GraphQL.subscription("notifyBotOwnerOnPush"))
@Tags("lifecycle", "notification")
export class NotifyBotOwnerOnPush extends AbstractNotifyBotOwner<graphql.NotifyBotOwnerOnPush.Subscription> {

    protected extractChatTeams(event: EventFired<graphql.NotifyBotOwnerOnPush.Subscription>)
        : ChatTeam[] {
        return _.get(event, "data.Push[0].repo.org.team.chatTeams");
    }

}
