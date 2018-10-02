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
    failure,
    HandleEvent,
    HandlerContext,
    HandlerResult,
    Success,
    SuccessPromise,
    Tags,
} from "@atomist/automation-client";
import { subscription } from "@atomist/automation-client/graph/graphQL";
import {
    addressSlackUsers,
    buttonForCommand,
} from "@atomist/automation-client/spi/message/MessageClient";
import {
    Attachment,
    codeLine,
    SlackMessage,
} from "@atomist/slack-messages";
import * as _ from "lodash";

import * as graphql from "../../../typings/types";
import { AddBotToChannel } from "../../command/slack/AddBotToChannel";
import { DefaultBotName } from "../../command/slack/LinkRepo";

// list of channels we look for to create buttons
const Channels = ["dev", "engineering", "development", "devops"];

@EventHandler("Displays a welcome message when a new org webhook is installed", subscription("orgWebhook"))
@Tags("enrollment")
export class GitHubWebhookCreated implements HandleEvent<graphql.OrgWebhook.Subscription> {

    public handle(
        event: EventFired<graphql.OrgWebhook.Subscription>,
        ctx: HandlerContext,
    ): Promise<HandlerResult> {

        const orgOwner = _.get(event, "data.Webhook[0].org.owner");
        const chatTeams = _.get(event, "data.Webhook[0].org.team.chatTeams") as
            graphql.OrgWebhook.ChatTeams[];

        return Promise.all(chatTeams.map(chatTeam => {
            if (!chatTeam) {
                return SuccessPromise;
            }
            const members = chatTeam.members;
            if (!members || members.length < 1) {
                return Promise.resolve(Success);
            }
            const owner = members.find(m => m.isOwner === "true");
            if (!owner) {
                return Promise.resolve(Success);
            }
            const ownerName = owner.screenName;
            const teamId = chatTeam.id;
            const bot = members.find(m => m.isAtomistBot === "true");
            const botName = (bot && bot.screenName) ? bot.screenName : DefaultBotName;

            const channels = (chatTeam.channels || []).filter(c => Channels.some(cc => cc === c.name));

            const welcomeAttachment: Attachment = {
                fallback: `Invite me to any channel where your team works using '/invite @${botName}'.`,
                mrkdwn_in: ["text"],
            };
            let suffix = ".";
            if (channels.length > 0) {
                suffix = " or click one of the buttons below.";
                welcomeAttachment.actions = channels.map(c => {
                    const addBotCmd = new AddBotToChannel();
                    addBotCmd.channelId = c.channelId;
                    return buttonForCommand({ text: `#${c.name}` }, addBotCmd);
                });
            }
            welcomeAttachment.text = `Invite me to any channel where your team works using ` +
                codeLine(`/invite @${botName}`) + suffix;

            const welcomeMsg: SlackMessage = { attachments: [welcomeAttachment] };
            return ctx.messageClient.send(
                welcomeMsg,
                addressSlackUsers(teamId, ownerName),
                { id: `webhook/create/${orgOwner}`, dashboard: false })
                .then(() => Success, failure);
        }))
        .then(() => Success, failure);
    }
}
