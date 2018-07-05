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
    logger,
    Secret,
    Secrets,
    Success,
    Tags,
} from "@atomist/automation-client";
import { subscription } from "@atomist/automation-client/graph/graphQL";
import {
    addressSlackChannels,
    buttonForCommand,
    menuForCommand,
    MenuSpecification,
    OptionGroup,
} from "@atomist/automation-client/spi/message/MessageClient";

import { user } from "@atomist/slack-messages";
import * as slack from "@atomist/slack-messages/SlackMessages";
import * as _ from "lodash";
import * as graphql from "../../../typings/types";
import {
    repoChannelName,
    repoSlackLink,
    repoSlug,
} from "../../../util/helpers";
import * as github from "../../command/github/gitHubApi";
import { LinkOwnerRepo } from "../../command/slack/LinkOwnerRepo";
import {
    DefaultBotName,
    LinkRepo,
} from "../../command/slack/LinkRepo";
import { NoLinkRepo } from "../../command/slack/NoLinkRepo";

export interface RepoApi {
    name: string;
    owner: string;
    api: string;
}

@EventHandler("Display a helpful message when the bot joins a channel", subscription("botJoinedChannel"))
@Tags("enrollment")
export class BotJoinedChannel implements HandleEvent<graphql.BotJoinedChannel.Subscription> {

    @Secret(Secrets.OrgToken)
    public orgToken: string;

    public handle(e: EventFired<graphql.BotJoinedChannel.Subscription>, ctx: HandlerContext): Promise<HandlerResult> {

        return Promise.all(e.data.UserJoinedChannel.map(j => {
            if (!j.user) {
                logger.debug(`UserJoinedChannel.user is false, probably not the bot joining a channel`);
                return Success;
            }
            if (j.user.isAtomistBot !== "true") {
                logger.debug(`user joining the channel is not the bot: ${j.user.screenName}`);
                return Success;
            }
            if (!j.channel) {
                logger.debug(`UserJoinedChannel.channel is false, strange`);
                return Success;
            }
            if (!j.channel.name) {
                logger.debug(`the channel has no name, odd`);
                return Success;
            }
            const channelName = j.channel.name;
            if (j.channel.botInvitedSelf) {
                logger.debug(`bot invited self to #${channelName}, not sending message`);
                return Success;
            }
            const botName = (j.user.screenName) ? j.user.screenName : DefaultBotName;

            const helloText = `Hello! Now I can respond to messages beginning with ${user(botName)}. ` +
                `To see some options, try \`@${botName} help\``;

            if (j.channel.repos && j.channel.repos.length > 0) {
                const linkedRepoNames = j.channel.repos.map(r => repoSlackLink(r));
                const msg = `${helloText}
I will post GitHub notifications about ${linkedRepoNames.join(", ")} here.`;
                return ctx.messageClient.send(msg, addressSlackChannels(j.channel.team.id, channelName));
            }

            if (!j.channel.team || !j.channel.team.orgs || j.channel.team.orgs.length < 1) {
                const msg = `${helloText}
I won't be able to do much without GitHub integration, though. Run \`@${botName} enroll org\` to set that up.`;
                return ctx.messageClient.send(msg, addressSlackChannels(j.channel.team.id, channelName));
            }
            const orgs = j.channel.team.orgs.filter(o => o);

            return Promise.all(orgs.map(o => {
                const repos: RepoApi[] = [];
                const apiUrl = (o.provider && o.provider.apiUrl) ? o.provider.apiUrl : undefined;
                const api = github.api(this.orgToken, apiUrl);
                return ((o.ownerType === "user") ?
                    api.repos.getForUser({ username: o.owner, per_page: 100 }) :
                    api.repos.getForOrg({ org: o.owner, per_page: 100 }))
                    .then(res => {
                        interface GitHubRepoResponse {
                            name: string;
                            owner: {
                                login: string;
                            };
                        }
                        const ghRepos = res.data as GitHubRepoResponse[];
                        ghRepos.forEach(ghr => repos.push({
                            name: ghr.name,
                            owner: ghr.owner.login,
                            api: apiUrl,
                        }));
                        return repos;
                    })
                    .catch(err => {
                        console.warn(`failed to get repos for ${o.owner}: ${err.message}`);
                        return repos;
                    });
            }))
                .then(lolRepos => {
                    const repos = _.flatten(lolRepos);
                    if (repos.length < 1) {
                        const owners = orgs.map(o => o.owner);
                        let ownerText: string;
                        if (owners.length > 2) {
                            owners[owners.length - 1] = "or " + owners[owners.length - 1];
                            ownerText = owners.join(", ");
                        } else if (owners.length === 2) {
                            ownerText = owners.join(" or ");
                        } else if (owners.length === 1) {
                            ownerText = owners[0];
                        }
                        ownerText = (ownerText) ? ` for ${ownerText}` : "";
                        const msg = `${helloText}
I don't see any repositories in GitHub${ownerText}.`;
                        return ctx.messageClient.send(msg, addressSlackChannels(j.channel.team.id, channelName));
                    }

                    const msgId = `channel_link/bot_joined_channel/${channelName}`;
                    const actions: slack.Action[] = [];

                    const matchyRepos =
                        _.uniqBy(fuzzyChannelRepoMatch(channelName, repos), r => `${r.owner}/${r.name}`);
                    matchyRepos.forEach(r => {
                        const linkRepo = new LinkRepo();
                        const org = orgs.find(o => o.owner === r.owner);
                        const apiUrl = (org && org.provider && org.provider.apiUrl) ?
                            org.provider.apiUrl : undefined;
                        linkRepo.apiUrl = apiUrl;
                        linkRepo.channelId = j.channel.channelId;
                        linkRepo.channelName = channelName;
                        linkRepo.owner = r.owner;
                        linkRepo.name = r.name;
                        linkRepo.msgId = msgId;
                        linkRepo.msg = helloText;
                        actions.push(buttonForCommand({ text: repoSlug(r) }, linkRepo));
                    });

                    if (repos.length > matchyRepos.length) {
                        const menu: MenuSpecification = {
                            text: "repository...",
                            options: repoOptions(lolRepos),
                        };
                        const linkRepoSlug = new LinkOwnerRepo();
                        linkRepoSlug.channelId = j.channel.channelId;
                        linkRepoSlug.channelName = channelName;
                        linkRepoSlug.msgId = msgId;
                        linkRepoSlug.msg = helloText;
                        actions.push(menuForCommand(menu, linkRepoSlug, "slug"));
                    }

                    const noLinkRepo = new NoLinkRepo();
                    noLinkRepo.channelName = channelName;
                    noLinkRepo.msgId = msgId;
                    const linkCmd = LinkRepo.linkRepoCommand(botName);
                    noLinkRepo.msg = `${helloText}
OK. If you want to link a repository later, type \`${linkCmd}\``;
                    actions.push(buttonForCommand({ text: "No thanks" }, noLinkRepo));

                    const msgText = "Since I'm here, would you like me to post notifications " +
                        "from a GitHub repository to this channel?";
                    const linkMsg: slack.SlackMessage = {
                        text: helloText,
                        attachments: [
                            {
                                text: msgText,
                                fallback: msgText,
                                mrkdwn_in: ["text"],
                                actions,
                            },
                        ],
                    };
                    return ctx.messageClient.send(linkMsg,
                        addressSlackChannels(j.channel.team.id, channelName), { id: msgId });
                });

        })).then(x => Success, failure);
    }
}

function repoSlugApi(repo: RepoApi): string {
    const api = (repo.api) ? repo.api : "";
    return `${repoSlug(repo)}|${api}`;
}

export function repoOptions(lol: RepoApi[][]): OptionGroup[] {
    return lol.map(repos => {
        if (repos.length < 1) {
            return null;
        }
        const owner = repos[0].owner;
        return {
            text: `${owner}/`,
            options: repos.map(r => {
                return { text: r.name, value: repoSlugApi(r) };
            }).sort((a, b) => a.text.localeCompare(b.text)),
        };
    }).filter(og => og);
}

/**
 * Find the best `max` repository name matches with `channel`.  To
 * match either the repository name must be contained in the channel
 * name or vice versa.  Matches are rated more highly if the
 * difference in length between the channel and repository names is
 * smaller, sorting matches with the same length difference by name.
 *
 * @param channel name of channel
 * @param repos repositories to search for matches
 * @param max maximum number of repositories to return
 * @return array of `max` matching repositories
 */
export function fuzzyChannelRepoMatch(
    channel: string,
    repos: graphql.BotJoinedChannel.Repo[],
    max: number = 2,
): graphql.BotJoinedChannel.Repo[] {

    const l = channel.length;
    const reposWithNames = repos.filter(r => r && r.name).map(r => ({ r, n: repoChannelName(r.name) }));
    const longRepos = reposWithNames.filter(rn => rn.n.includes(channel))
        .map(rn => ({ r: rn.r, d: rn.n.length - l }));
    const shortRepos = reposWithNames.filter(rn => channel.includes(rn.n))
        .map(rn => ({ r: rn.r, d: l - rn.n.length }));
    const matchesWithDiff = longRepos.concat(shortRepos);
    return matchesWithDiff.sort((a, b) => {
        const diff = a.d - b.d;
        if (diff === 0) {
            return a.r.name.localeCompare(b.r.name);
        }
        return diff;
    }).slice(0, max).map(rd => rd.r);
}
