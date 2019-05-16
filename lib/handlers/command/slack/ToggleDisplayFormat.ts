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
    failure,
    guid,
    HandlerContext,
    HandlerResult,
    MappedParameter,
    MappedParameters,
    Parameter,
    QueryNoCacheOptions,
    success,
    Tags,
} from "@atomist/automation-client";
import { CommandHandler } from "@atomist/automation-client/lib/decorators";
import { HandleCommand } from "@atomist/automation-client/lib/HandleCommand";
import {
    bold,
    SlackMessage,
} from "@atomist/slack-messages";
import * as _ from "lodash";
import { SdmGoalDisplayFormat } from "../../../typings/types";
import * as graphql from "../../../typings/types";

export const LifecyclePreferencesName = "lifecycle_preferences";

@CommandHandler("Toggle the lifecycle rendering format")
@Tags("slack")
export class ToggleDisplayFormat implements HandleCommand {

    @Parameter({ description: "id of the message to use for confirmation", pattern: /^.*$/,
        required: false, displayable: false })
    public msgId: string;

    @MappedParameter(MappedParameters.SlackTeam, false)
    public teamId: string;

    public handle(ctx: HandlerContext): Promise<HandlerResult> {
        if (!this.msgId) {
            this.msgId = guid();
        }

        return isCompactStyleEnabled(this.teamId, ctx)
            .then(preferencesState => {
                const preferences =
                    _.cloneDeep(preferencesState.preferences);

                const enabled: SdmGoalDisplayFormat = preferencesState.enabled ?
                    SdmGoalDisplayFormat.full : SdmGoalDisplayFormat.compact;

                _.set(preferences, "push.configuration['rendering-style']", enabled);

                return ctx.graphClient.mutate<graphql.SetChatTeamPreference.Mutation,
                    graphql.SetChatTeamPreference.Variables>({
                    name: "setChatTeamPreference",
                    variables: {
                        teamId: this.teamId,
                        name: LifecyclePreferencesName,
                        value: JSON.stringify(preferences),
                    },
                })
                .then(() => preferencesState);
            })
            .then(preferencesState => {
                const enabled = !preferencesState.enabled;
                const text = bold(`'Compact Lifecycle Rendering Format' ${enabled ? "enabled" : "disabled"}`);

                const msg: SlackMessage = {
                    attachments: [{
                        author_icon: `https://images.atomist.com/rug/check-circle.gif?gif=${guid()}`,
                        author_name: "Successfully updated your preferences",
                        text,
                        fallback: text,
                        color: "#37A745",
                        mrkdwn_in: [ "text" ],
                    }],
                };

                return ctx.messageClient.respond(msg, { id: this.msgId, dashboard: false });
            })
            .then(success, failure);
    }
}

export function isCompactStyleEnabled(teamId: string, ctx: HandlerContext)
: Promise<{preferences: graphql.ChatTeamPreferences.Preferences, enabled: boolean}> {
    return ctx.graphClient.query<graphql.ChatTeamPreferences.Query,
        graphql.ChatTeamPreferences.Variables>({
            name: "chatTeamPreferences",
            variables: { teamId },
            options: QueryNoCacheOptions,
        })
        .then(result => {
            const preferences = (_.get(result, "ChatTeam[0].preferences")
                || []) as graphql.ChatTeamPreferences.Preferences[];
            const lifecyclePreferences = preferences.find(p => p.name === LifecyclePreferencesName);
            if (lifecyclePreferences) {
                const lp = JSON.parse(lifecyclePreferences.value);
                return {
                    preferences: lp,
                    enabled: _.get(lp, "push.configuration['rendering-style']") === SdmGoalDisplayFormat.compact,
                };
            }
            return {
                preferences: {},
                enabled: false,
            };
        });
}
