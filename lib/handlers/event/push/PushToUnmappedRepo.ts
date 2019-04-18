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
    addressSlackUsers,
    buttonForCommand,
    failure,
    GraphQL,
    HandlerContext,
    HandlerResult,
    logger,
    menuForCommand,
    MenuSpecification,
    Success,
} from "@atomist/automation-client";
import { EventHandlerRegistration } from "@atomist/sdm";
import * as slack from "@atomist/slack-messages";
import * as _ from "lodash";
import * as graphql from "../../../typings/types";
import { PushToUnmappedRepo } from "../../../typings/types";
import {
    isDmDisabled,
    repoChannelName,
    repoSlackLink,
} from "../../../util/helpers";
import { DefaultGitHubApiUrl } from "../../command/github/gitHubApi";
import { SetUserPreference } from "../../command/preferences/SetUserPreference";
import { CreateChannel } from "../../command/slack/CreateChannel";
import {
    DefaultBotName,
    LinkRepo,
} from "../../command/slack/LinkRepo";
import { DirectMessagePreferences } from "../preferences";

/**
 * Suggest mapping a repo to committer on unmapped repo.
 */
export function pushToUnmappedRepo(): EventHandlerRegistration<PushToUnmappedRepo.Subscription> {
    return {
        name: "PushToUnmappedRepo",
        description: "Suggest mapping a repo to committer on unmapped repo",
        tags: ["lifecycle", "push"],
        subscription: GraphQL.subscription("pushToUnmappedRepo"),
        listener: async (e, ctx) => {
            return Promise.all(e.data.Push.map(p => {
                if (p.repo && p.repo.channels && p.repo.channels.length > 0) {
                    // already mapped
                    return Success;
                }
                if (!p.commits || p.commits.length < 1) {
                    // strange
                    return Success;
                }

                const botNames: { [teamId: string]: string; } = {};

                const chatTeams = (_.get(p, "repo.org.team.chatTeams")
                    || []) as graphql.PushToUnmappedRepo.ChatTeams[];

                chatTeams.forEach(ct => {
                    if (ct.members && ct.members.length > 0 && ct.members.some(m => m.isAtomistBot === "true")) {
                        botNames[ct.id] = ct.members.find(m => m.isAtomistBot === "true").screenName;
                    } else {
                        botNames[ct.id] = DefaultBotName;
                    }
                });

                const chatIds = p.commits.filter(c => c.author &&
                    c.author.person &&
                    c.author.person.chatId &&
                    c.author.person.chatId.chatTeam &&
                    c.author.person.chatId.chatTeam.id)
                    .map(c => c.author.person.chatId);

                return sendUnMappedRepoMessage(chatIds, p.repo, ctx, botNames);
            }))
                .then(() => Success, failure);
        },
    };
}

const repoMappingConfigKey = "repo_mapping_flow";
const disabledReposConfigKey = "disabled_repos";

export function sendUnMappedRepoMessage(
    chatIds: graphql.PushToUnmappedRepo.ChatId[],
    repo: graphql.PushToUnmappedRepo.Repo,
    ctx: HandlerContext,
    botNames: { [teamId: string]: string; },
): Promise<HandlerResult> {

    const enabledChatIds = chatIds.filter(c => {
        return !isDmDisabled(c, DirectMessagePreferences.mapRepo.id) &&
            !leaveRepoUnmapped(repo, c);
    });

    if (enabledChatIds.length < 1) {
        return Promise.resolve(Success);
    }

    return Promise.all(enabledChatIds.map(chatId => {
        const id = mapRepoMessageId(repo.owner, repo.name, chatId.screenName);
        return ctx.messageClient.send(
            mapRepoMessage(repo, chatId, botNames[chatId.chatTeam.id]) || DefaultBotName,
            addressSlackUsers(chatId.chatTeam.id, chatId.screenName),
            { id, dashboard: false });
    }))
        .then(() => Success);
}

/**
 * Create consistent message ID for unmapped repo push updatable message.
 *
 * @param owner org/user that owns repository being linked
 * @param repo name of repository being linked
 * @param screenName chat screen name of person being sent message
 * @return message ID string
 */
export function mapRepoMessageId(owner: string, repo: string, screenName: string): string {
    return `user_message/unmapped_repo/${screenName}/${owner}/${repo}`;
}

/**
 * Extract screen name of user sent message from message ID.  If the
 * msgId is not of the appropriate format, i.e., generated by
 * mapRepoMessageId, it returns null.
 *
 * @param msgId ID of message
 * @return screen name
 */
export function extractScreenNameFromMapRepoMessageId(msgId: string): string {
    if (!msgId) {
        return null;
    }
    const msgParts = msgId.split("/");
    if (msgParts.length < 3) {
        return null;
    }
    return msgParts[2];
}

function getDisabledRepos(preferences: graphql.PushToUnmappedRepo._Preferences[]): string[] {
    if (!preferences) {
        return [];
    }
    const repoMappingFlow = preferences.find(p => p.name === repoMappingConfigKey);
    if (!repoMappingFlow) {
        return [];
    }
    let mappingConfig: any;
    try {
        mappingConfig = JSON.parse(repoMappingFlow.value);
    } catch (e) {
        const err = (e as Error).message;
        logger.error(`failed to parse ${repoMappingConfigKey} value '${repoMappingFlow.value}': ${err}`);
        return [];
    }
    if (!mappingConfig[disabledReposConfigKey]) {
        return [];
    }
    return mappingConfig[disabledReposConfigKey] as string[];
}

export function repoString(repo: graphql.PushToUnmappedRepo.Repo): string {
    if (!repo) {
        return "!";
    }
    const provider = (repo.org && repo.org.provider && repo.org.provider.providerId) ?
        `${repo.org.provider.providerId}:` : "";
    return `${provider}${repo.owner}:${repo.name}`;
}

export function leaveRepoUnmapped(
    repo: graphql.PushToUnmappedRepo.Repo,
    chatId: graphql.PushToUnmappedRepo.ChatId,
): boolean {

    const repoStr = repoString(repo);
    return getDisabledRepos(chatId.preferences).some(r => r === repoStr);
}

function populateMapCommand(c: CreateChannel, repo: graphql.PushToUnmappedRepo.Repo, msgId: string): CreateChannel {
    c.apiUrl = (repo.org.provider) ? repo.org.provider.apiUrl : DefaultGitHubApiUrl;
    c.owner = repo.owner;
    c.repo = repo.name;
    c.msgId = msgId;
    return c;
}

/**
 * Find the best `max` channel name matches with `repo`.  To
 * match either the repository name must be contained in the channel
 * name or vice versa.  Matches are rated more highly if the
 * difference in length between the channel and repository names is
 * smaller, sorting matches with the same length difference by name.
 *
 * @param repo name of repository
 * @param channels channels to search for matches
 * @param max maximum number of repositories to return
 * @return array of `max` matching channels
 */
export function fuzzyRepoChannelMatch(
    repo: string,
    channels: graphql.PushToUnmappedRepo.Channels[],
    max: number = 2,
): graphql.PushToUnmappedRepo.Channels[] {

    const rcName = repoChannelName(repo);
    const l = rcName.length;
    const longChannels = channels.filter(c => c && c.name && c.name.includes(rcName))
        .map(c => ({ c, d: c.name.length - l }));
    const shortChannels = channels.filter(c => c && c.name && rcName.includes(c.name))
        .map(c => ({ c, d: l - c.name.length }));
    const matchesWithDiff = longChannels.concat(shortChannels);
    return matchesWithDiff.sort((a, b) => {
        const diff = a.d - b.d;
        if (diff === 0) {
            return a.c.name.localeCompare(b.c.name);
        }
        return diff;
    }).slice(0, max).map(cd => cd.c);
}

export function mapRepoMessage(
    repo: graphql.PushToUnmappedRepo.Repo,
    chatId: graphql.PushToUnmappedRepo.ChatId,
    botName: string,
): slack.SlackMessage {

    const channelName = repoChannelName(repo.name);
    const slug = `${repo.owner}/${repo.name}`;
    const slugText = repoSlackLink(repo);
    const msgId = mapRepoMessageId(repo.owner, repo.name, chatId.screenName);
    botName = botName || DefaultBotName;

    const mapActions: slack.Action[] = [];
    const channels = repo.org.team.chatTeams.find(ct => ct.id === chatId.chatTeam.id).channels;
    const channel = channels.find(c => c.name === channelName);
    let addSelector = true;
    if (channel) {
        const mapCommand = new CreateChannel();
        mapCommand.channel = channel.name;
        populateMapCommand(mapCommand, repo, msgId);
        const mapButtonText = `#${channelName}`;
        const mapRepoButton = buttonForCommand({ text: mapButtonText, style: "primary" }, mapCommand);
        mapActions.push(mapRepoButton);
        addSelector = channels.length > 1;
    } else {
        const createCommand = new CreateChannel();
        createCommand.channel = channelName;
        populateMapCommand(createCommand, repo, msgId);
        const createButtonText = `Create #${channelName}`;
        const createRepoButton = buttonForCommand({ text: createButtonText, style: "primary" }, createCommand);
        mapActions.push(createRepoButton);
        const matchyChannels = fuzzyRepoChannelMatch(repo.name, channels);
        matchyChannels.forEach(c => {
            const mapCommand = new CreateChannel();
            mapCommand.channel = c.name;
            populateMapCommand(mapCommand, repo, msgId);
            const mapButtonText = `#${c.name}`;
            const mapRepoButton = buttonForCommand({ text: mapButtonText }, mapCommand);
            mapActions.push(mapRepoButton);
        });
        addSelector = channels.length > matchyChannels.length;
    }
    if (addSelector) {
        const menu: MenuSpecification = {
            text: "Other channel...",
            options: channels.filter(a => a.name).sort((a, b) => a.name.localeCompare(b.name)).slice(0, 100)
                .map(c => ({ text: c.name, value: c.name })),
        };
        const mapCommand = new CreateChannel();
        populateMapCommand(mapCommand, repo, msgId);
        const mapRepoMenu = menuForCommand(menu, mapCommand, "channel");
        mapActions.push(mapRepoMenu);
    }

    const mapFallback = `Want to put me to work on ${slug} in a channel?`;
    const mapText = `Want to put me to work on ${slugText} in a channel?`;
    const mapAttachment: slack.Attachment = {
        pretext: mapText,
        fallback: mapFallback,
        text: "",
        mrkdwn_in: ["pretext"],
        actions: mapActions,
    };

    const linkRepoCmd = LinkRepo.linkRepoCommand(botName, repo.owner, repo.name);
    const hintText = `or ${slack.codeLine("/invite @" + botName)} me to a relevant channel and type
${slack.codeLine(linkRepoCmd)}`;
    const hintFallback = `or '/invite @${botName}' me to a relevant channel and type\n'${linkRepoCmd}'`;
    const hintAttachment: slack.Attachment = {
        fallback: hintFallback,
        text: hintText,
        mrkdwn_in: ["text"],
    };

    const stopText = `This is the last time I will ask you about ${slack.bold(slug)}. You can stop receiving ` +
        `similar suggestions for all repositories by clicking the button below.`;
    const stopFallback = `This is the last time I will ask you about ${slug}. You can stop receiving ` +
        `similar suggestions for all repositories by clicking the button below.`;
    const stopAllParams = new SetUserPreference();
    stopAllParams.key = "dm";
    stopAllParams.name = `disable_for_${DirectMessagePreferences.mapRepo.id}`;
    stopAllParams.value = "true";
    stopAllParams.label = `'${DirectMessagePreferences.mapRepo.name}' direct messages disabled`;
    stopAllParams.id = msgId;
    const stopAllButton = buttonForCommand({ text: "All Repositories" }, stopAllParams);

    const stopAttachment: slack.Attachment = {
        text: stopText,
        fallback: stopFallback,
        mrkdwn_in: ["text"],
        actions: [stopAllButton],
    };

    const msg: slack.SlackMessage = {
        attachments: [
            mapAttachment,
            hintAttachment,
            stopAttachment,
        ],
    };
    return msg;
}
