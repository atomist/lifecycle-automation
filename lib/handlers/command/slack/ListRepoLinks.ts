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
    buttonForCommand,
    failure,
    guid,
    HandlerContext,
    HandlerResult,
    MappedParameter,
    MappedParameters,
    Parameter,
    QueryNoCacheOptions,
    Success,
    Tags,
} from "@atomist/automation-client";
import { CommandHandler } from "@atomist/automation-client/lib/decorators";
import { HandleCommand } from "@atomist/automation-client/lib/HandleCommand";
import {
    Attachment,
    SlackMessage,
    url,
} from "@atomist/slack-messages";
import * as _ from "lodash";
import * as graphql from "../../../typings/types";
import { repoUrl } from "../../../util/helpers";
import { LinkRepo } from "./LinkRepo";
import { UnlinkRepo } from "./UnlinkRepo";

@CommandHandler("View repos linked to this channel and optionally unlink them", "repos", "repositories")
@Tags("slack", "repo")
export class ListRepoLinks implements HandleCommand {

    @MappedParameter(MappedParameters.SlackChannelName)
    public channelName: string;

    @MappedParameter(MappedParameters.SlackTeam)
    public teamId: string;

    @Parameter({ pattern: /^\S*$/, displayable: false, required: false })
    public msgId: string;

    public handle(ctx: HandlerContext): Promise<HandlerResult> {
        if (!this.msgId) {
            this.msgId = guid();
        }

        return ctx.graphClient.query<graphql.ChatChannelByChannelId.Query,
            graphql.ChatChannelByChannelId.Variables>({
                name: "chatChannelByChannelId",
                variables: {
                    teamId: this.teamId,
                    channelName: this.channelName,
                },
                options: QueryNoCacheOptions,
            })
            .then(result => {
                const repos = _.get(result, "ChatTeam[0].channels[0].repos") as
                    graphql.ChatChannelByChannelId.Repos[];
                if (repos && repos.length > 0) {

                    const msg: SlackMessage = {
                        attachments: [],
                    };

                    repos.forEach(r => {
                        const handler = new UnlinkRepo();
                        handler.msgId = this.msgId;
                        handler.name = r.name;
                        handler.owner = r.owner;
                        handler.provider = r.org.provider.providerId;

                        const slug = `${r.owner}/${r.name}`;
                        const attachment: Attachment = {
                            fallback: slug,
                            text: `${url(repoUrl(r), slug)}`,
                            actions: [
                                buttonForCommand({ text: "Unlink", style: "danger" }, handler),
                            ],
                        };
                        msg.attachments.push(attachment);
                    });

                    msg.attachments[0].pretext = "The following repositories are linked to this channel:";

                    return ctx.messageClient.respond(linkRepoAttachment(msg), { id: this.msgId, dashboard: false });
                } else {

                    const text = "There are no repositories linked to this channel." +
                        "\nTo link a repository, type `@atomist repo` or use the button below.";

                    const msg: SlackMessage = {
                        attachments: [{
                            text,
                            fallback: text,
                            mrkdwn_in: ["text"],
                            color: "#B5B5B5",
                        }],
                    };

                    return ctx.messageClient.respond(linkRepoAttachment(msg), { id: this.msgId, dashboard: false });
                }
            })
            .then(() => Success, failure);
    }
}

function linkRepoAttachment(msg: SlackMessage) {
    const handler = new LinkRepo();
    const attachment: Attachment = {
        text: "Link a new repository to this channel:",
        fallback: "Link a new repository to this channel:",
        actions: [
            buttonForCommand({ text: "Link Repository", style: "primary" }, handler),
        ],
    };
    msg.attachments.push(attachment);
    return msg;
}
