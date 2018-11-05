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
    HandlerContext,
    HandlerResult,
    MappedParameter,
    MappedParameters,
    Parameter,
    Success,
} from "@atomist/automation-client";
import { ConfigurableCommandHandler } from "@atomist/automation-client/lib/decorators";
import { HandleCommand } from "@atomist/automation-client/lib/HandleCommand";
import { user } from "@atomist/slack-messages";
import { getChatIds } from "../../../util/helpers";
import { kickUserFromSlackChannel } from "./AssociateRepo";

@ConfigurableCommandHandler("Kick a user from a Slack channel", {
    autoSubmit: true,
    intent: ["kick user"],
})
export class KickUserFromSlackChannel implements HandleCommand {

    @MappedParameter(MappedParameters.SlackTeam)
    public teamId: string;

    @MappedParameter(MappedParameters.SlackChannel)
    public channelId: string;

    @Parameter({ description: "Id of the user to kick" })
    public userId: string;

    public async handle(ctx: HandlerContext): Promise<HandlerResult> {
        const users = getChatIds(this.userId);
        await ctx.messageClient.respond(`Good bye ${user(users[0])} :wave:`);
        await kickUserFromSlackChannel(ctx, this.teamId, this.channelId, users[0]);
        return Success;
    }
}
