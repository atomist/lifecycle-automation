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
    failure,
    HandleEvent,
    HandlerContext,
    HandlerResult,
    logger,
    Success,
} from "@atomist/automation-client";
import { addressSlackUsers } from "@atomist/automation-client/spi/message/MessageClient";
import * as _ from "lodash";
import { ChatTeam } from "../../lifecycle/Lifecycle";
import * as graphql from "../../typings/types";

const PageSize = 50;
const Message = "GitHub events are flowing for your organizations but they're not visible in any Slack channels yet. " +
    "To enable this, go to a channel and invite me by typing `/invite @atomist`";
const PreferenceKey = "disable_bot_owner_on_github_activity_notification";

export abstract class AbstractNotifyBotOwner<R> implements HandleEvent<R> {

    public handle(event: EventFired<any>,
                  ctx: HandlerContext): Promise<HandlerResult> {
        const chatTeams = (this.extractChatTeams(event) || [])
            .filter(ct => ct.preferences.some(p => p.name === PreferenceKey));

        return Promise.all(chatTeams.map(ct => {
            return ctx.graphClient.query<graphql.Channels.Query, graphql.Channels.Variables>({
                    name: "channels",
                    variables: {
                        teamId: ct.id,
                        first: PageSize,
                        offset: 0,
                    },
                })
                .then(function page(result, offset = 0) {
                    const channels = _.get(result, "ChatTeam[0].channels") as graphql.Channels.Channels[];
                    if (!channels || channels.length === 0) {
                        return handleResult(ct, false, ctx);
                    } else if (channels && channels.some(c => c.repos && c.repos.length > 0)) {
                        return handleResult(ct, true, ctx);
                    }

                    offset = offset + PageSize;
                    return ctx.graphClient.query<graphql.Channels.Query, graphql.Channels.Variables>({
                            name: "channels",
                            variables: {
                                teamId: ct.id,
                                first: PageSize,
                                offset,
                            },
                        })
                        .then(innerResult => page(innerResult, offset));
                })
                .then(() => Success, failure);
        }))
        .then(() => Success, failure);
    }

    protected abstract extractChatTeams(event: EventFired<R>): ChatTeam[];
}

function handleResult(team: ChatTeam,
                      mappedRepo: boolean,
                      ctx: HandlerContext): Promise<HandlerResult> {
    if (!mappedRepo) {
        return ctx.graphClient.query<graphql.BotOwner.Query, graphql.BotOwner.Variables>({
                name: "botOwner",
                variables: {
                    teamId: team.id,
                },
            })
            .then(r => {
                const members = (_.get(r, "ChatTeam[0].members") || []) as graphql.BotOwner.Members[];
                return members.map(c => c.screenName);
            })
            .then(owners => {
                if (owners && owners.length > 0) {
                    logger.debug(`Notifying '${owners.join(", ")}' about GitHub activity`);
                    return ctx.messageClient.send(
                        Message, addressSlackUsers(team.id, ...owners),
                        { id: `bot_owner/github/notification`, ttl: 1000 * 60 * 60 * 24 * 7});
                }
            })
            .then(() => Success, failure);
    } else {
        logger.debug(`Setting team preferences '${PreferenceKey}' to 'true'`);
        return ctx.graphClient.mutate<graphql.SetChatTeamPreference.Mutation,
                graphql.SetChatTeamPreference.Variables>({
                name: "setChatTeamPreference",
                variables: {
                    teamId: team.id,
                    name: PreferenceKey,
                    value: "true",
                },
            })
            .then(() => Success, failure);
    }
}
