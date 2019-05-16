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
    codeBlock,
    SlackMessage,
    url,
} from "@atomist/slack-messages";
import * as _ from "lodash";
import * as graphql from "../../../typings/types";
import { supportLink } from "../../../util/messages";

export const LifecyclePreferencesName = "lifecycle_preferences";

@CommandHandler("Toggle the enablement of the custom lifecycle emojis")
@Tags("slack", "emoji")
export class ToggleCustomEmojiEnablement implements HandleCommand {

    @Parameter({
        description: "id of the message to use for confirmation", pattern: /^.*$/,
        required: false,
        displayable: false,
    })
    public msgId: string;

    @MappedParameter(MappedParameters.SlackTeam, false)
    public teamId: string;

    public handle(ctx: HandlerContext): Promise<HandlerResult> {
        if (!this.msgId) {
            this.msgId = guid();
        }

        return isCustomEmojisEnabled(this.teamId, ctx)
            .then(preferencesState => {
                const preferences =
                    _.cloneDeep(preferencesState.preferences);

                const enabled: string = preferencesState.enabled ? "default" : "atomist";

                _.set(preferences, "push.configuration['emoji-style']", enabled);
                _.set(preferences, "pull_request.configuration['emoji-style']", enabled);

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
                const fallback = `'Custom Lifecycle Emojis' ${enabled ? "enabled" : "disabled"}`;
                const text = bold(fallback);

                const msg: SlackMessage = {
                    attachments: [{
                        author_icon: `https://images.atomist.com/rug/check-circle.gif?gif=${guid()}`,
                        author_name: "Successfully updated your preferences",
                        text,
                        fallback,
                        color: "#37A745",
                        mrkdwn_in: ["text"],
                    }],
                };

                if (enabled) {
                    const subdomain = preferencesState.domain;
                    const baseUrl = "https://static.atomist.com";
                    const scriptUrl = `${baseUrl}/atomist-emojis.bash`;
                    const zipUrl = `${baseUrl}/atomist-emojis-latest.zip`;
                    const emojiUrl = `https://${subdomain}.slack.com/customize/emoji`;
                    const emojiHelpUrl = "https://get.slack.help/hc/en-us/articles/206870177-Create-custom-emoji";
                    const instructions = "You can add the Atomist emojis to your Slack workspace with the command:\n" +
                        codeBlock(`bash <(curl -sL ${scriptUrl}) ${subdomain} SLACK_TOKEN`) + "\nFollow these " +
                        url("https://github.com/jackellenberger/emojme#finding-a-slack-token", "instructions to get your Slack token") +
                        `. Or download the ${url(zipUrl, "Atomist emojis archive")} and add them using the ` +
                        url(emojiUrl, "Slack web interface") + ".";
                    const instructionsFallback = `You can add the Atomist emojis your Slack workspace with the command 'bash ` +
                        `<(curl -sL ${scriptUrl}) ${subdomain} SLACK_TOKEN'. Or download them from ${zipUrl} and add using ${emojiUrl}.`;
                    msg.attachments.push({
                        text: instructions,
                        fallback: instructionsFallback,
                        footer: [url(emojiHelpUrl, "Slack Emoji Help"), supportLink(ctx)].join(" \u00B7 "),
                        mrkdwn_in: ["text"],
                    });
                }
                return ctx.messageClient.respond(msg, { id: this.msgId, dashboard: false });
            })
            .then(success, failure);
    }
}

export function isCustomEmojisEnabled(teamId: string, ctx: HandlerContext)
    : Promise<{ preferences: graphql.ChatTeamPreferences.Preferences, enabled: boolean, domain: string }> {
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
                    enabled: _.get(lp, "push.configuration['emoji-style']") === "atomist",
                    domain: result.ChatTeam[0].domain,
                };
            }
            return {
                preferences: {},
                enabled: false,
                domain: result.ChatTeam[0].domain,
            };
        });
}
