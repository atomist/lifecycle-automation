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

import {
    addressSlackChannels,
    buttonForCommand,
    GraphQL,
    guid,
    HandlerContext,
    Success,
} from "@atomist/automation-client";
import { EventHandlerRegistration } from "@atomist/sdm";
import {
    Action,
    bold,
    codeLine,
    SlackMessage,
} from "@atomist/slack-messages";
import { ChannelLinkCreated } from "../../../typings/types";
import { repoSlackLink } from "../../../util/helpers";
import { ListRepoLinks } from "../../command/slack/ListRepoLinks";

export function channelLinkCreated(): EventHandlerRegistration<ChannelLinkCreated.Subscription> {
    return {
        name: "ChannelLinkCreated",
        description: "Display an unlink message when a channel is linked",
        tags: "enrollment",
        subscription: GraphQL.subscription("channelLinkCreated"),
        listener: async (e, ctx) => {
            const channelName = e.data.ChannelLink[0].channel.name || e.data.ChannelLink[0].channel.normalizedName;
            const teamId = e.data.ChannelLink[0].channel.team.id;
            const repo = e.data.ChannelLink[0].repo;
            const repoLink = repoSlackLink(repo);
            const msgId = `channel_link/${channelName}`;

            const linkMsg = `${repoLink} is now linked to this channel. I will send activity from that \
repository here. To turn this off, type ${codeLine("@atomist repos")} and click the ${bold("Unlink")} button.`;

            await sendLinkMessage(teamId, channelName, linkMsg, msgId, ctx);
            return Success;
        },
    };
}

function sendLinkMessage(teamId: string, channelName: string, linkMsg: string, msgId, ctx: HandlerContext) {
    const msg: SlackMessage = {
        attachments: [{
            author_icon: `https://images.atomist.com/rug/check-circle.gif?gif=${guid()}`,
            author_name: "Channel Linked",
            text: linkMsg,
            fallback: linkMsg,
            color: "#37A745",
            mrkdwn_in: ["text"],
            actions: [
                createListRepoLinksAction(msgId),
            ],
        }],
    };
    return ctx.messageClient.send(
        msg,
        addressSlackChannels(teamId, channelName),
        {
            id: msgId,
            dashboard: false,
            ttl: 1000 * 60 * 5,
        });
}

function createListRepoLinksAction(msgId: string): Action {
    const repoList = new ListRepoLinks();
    repoList.msgId = msgId;
    return buttonForCommand({ text: "List Repository Links" }, repoList);
}
