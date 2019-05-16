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
    logger,
    MappedParameter,
    MappedParameters,
    Parameter,
    QueryNoCacheOptions,
    Success,
    Tags,
} from "@atomist/automation-client";
import { CommandHandler } from "@atomist/automation-client/lib/decorators";
import { HandleCommand } from "@atomist/automation-client/lib/HandleCommand";
import { SlackMessage } from "@atomist/slack-messages";
import * as _ from "lodash";
import * as graphql from "../../../typings/types";

/**
 * Merge preference for the invoking user.
 */
@CommandHandler("Merge preference for the invoking user")
@Tags("preferences", "set")
export class SetUserPreference implements HandleCommand {

    @MappedParameter(MappedParameters.SlackTeam)
    public teamId: string;

    @MappedParameter(MappedParameters.SlackUser)
    public requester: string;

    @Parameter({
        displayName: "Preference Category",
        description: "category of preferences under which you want to set a preference",
        pattern: /^\S+$/,
        validInput: "non-whitespace characters, 1 to 100 characters in length",
        minLength: 1,
        maxLength: 100,
        required: true,
    })
    public key: string;

    @Parameter({
        displayName: "Preference Name",
        description: "key of preference to set",
        pattern: /^\S+$/,
        validInput: "non-whitespace characters, 1 to 100 characters in length",
        minLength: 1,
        maxLength: 100,
        required: true,
    })
    public name: string;

    @Parameter({
        displayName: "Preference Value",
        description: "value to set the preference to, typically stringified JSON but can be just a string",
        pattern: /^[\S\s]*$/,
        validInput: "a string 1000 characters or less",
        minLength: 0,
        maxLength: 1000,
        required: true,
    })
    public value: string;

    @Parameter({
        displayable: false,
        description: "id of the message to use for confirmation",
        pattern: /^\S*$/,
        required: false,
    })
    public id: string;

    @Parameter({
        displayable: false,
        description: "label to show in confirmation message",
        pattern: /^.*$/,
        required: false,
    })
    public label: string;

    public handle(ctx: HandlerContext): Promise<HandlerResult> {
        return ctx.graphClient.query<graphql.ChatId.Query, graphql.ChatId.Variables>({
                name: "chatId",
                variables: {
                    teamId: this.teamId,
                    chatId: this.requester,
                },
                options: QueryNoCacheOptions,
            })
            .then(result => {
                const preferences =
                    _.get(result, "ChatTeam[0].members[0].preferences") as graphql.ChatId.Preferences[];
                const id = _.get(result, "ChatTeam[0].members[0].id") as string;
                if (preferences) {
                    const keyPreferences = preferences.find(p => p.name === this.key);
                    if (keyPreferences) {
                        return {id, preferences: JSON.parse(keyPreferences.value)};
                    }
                }
                return {id, preferences: {}};
            })
            .then(result => {
                let value: any;
                try {
                    value = JSON.parse(this.value);
                } catch (e) {
                    const err = (e as Error).message;
                    logger.error(`Failed to parse config value '${this.value}' using string: ${err}`);
                    value = this.value;
                }
                result.preferences[this.name] = value;
                return ctx.graphClient.mutate<graphql.SetChatUserPreference.Mutation,
                        graphql.SetChatUserPreference.Variables>({
                        name: "setChatUserPreference",
                        variables: {
                            teamId: this.teamId,
                            userId: result.id,
                            name: this.key,
                            value: JSON.stringify(result.preferences),
                        },
                    });
            })
            .then(() => {
                const msg: SlackMessage = {
                    attachments: [{
                        author_icon: `https://images.atomist.com/rug/check-circle.gif?gif=${guid()}`,
                        author_name: "Successfully updated your preferences",
                        fallback: "Successfully updated your preferences",
                        title: this.label ? this.label : undefined,
                        color: "#37A745",
                        actions: [
                            buttonForCommand({ text: "Configure DMs" }, "ConfigureDirectMessageUserPreferences",
                                { id: this.id }),
                        ],
                    },
                    ],
                };
                return ctx.messageClient.respond(msg, { id: this.id, dashboard: false });
            })
            .then(() => Success, failure);
    }
}
