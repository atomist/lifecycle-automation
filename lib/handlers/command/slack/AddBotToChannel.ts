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
    failure,
    HandlerContext,
    HandlerResult,
    MappedParameter,
    MappedParameters,
    Success,
    Tags,
} from "@atomist/automation-client";
import { CommandHandler } from "@atomist/automation-client/lib/decorators";
import { HandleCommand } from "@atomist/automation-client/lib/HandleCommand";
import * as slack from "@atomist/slack-messages";

import { AddBotToSlackChannel } from "../../../typings/types";

export function addBotToSlackChannel(ctx: HandlerContext,
                                     teamId: string,
                                     channelId: string): Promise<AddBotToSlackChannel.Mutation> {
    return ctx.graphClient.mutate<AddBotToSlackChannel.Mutation, AddBotToSlackChannel.Variables>({
            name: "addBotToSlackChannel",
            variables: {
                teamId,
                channelId,
            },
        });
}

@CommandHandler("Invite the Atomist Bot to a channel")
@Tags("slack", "bot")
export class AddBotToChannel implements HandleCommand {

    @MappedParameter(MappedParameters.SlackTeam)
    public teamId: string;

    @MappedParameter(MappedParameters.SlackChannel)
    public channelId: string;

    public handle(ctx: HandlerContext): Promise<HandlerResult> {
        return addBotToSlackChannel(ctx, this.teamId, this.channelId)
            .then(() => Success, failure);
    }

}
