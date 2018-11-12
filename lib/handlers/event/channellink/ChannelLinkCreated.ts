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
    addressSlackChannels,
    buttonForCommand,
    EventFired,
    failure,
    guid,
    HandlerContext,
    HandlerResult,
    Secret,
    Secrets,
    success,
    Tags,
} from "@atomist/automation-client";
import { EventHandler } from "@atomist/automation-client/lib/decorators";
import * as GraphQL from "@atomist/automation-client/lib/graph/graphQL";
import { HandleEvent } from "@atomist/automation-client/lib/HandleEvent";
import {
    Action,
    bold,
    codeLine,
    SlackMessage,
} from "@atomist/slack-messages";
import * as _ from "lodash";
import * as graphql from "../../../typings/types";
import {
    apiUrl,
    repoSlackLink,
} from "../../../util/helpers";
import { warning } from "../../../util/messages";
import * as github from "../../command/github/gitHubApi";
import {
    InstallGitHubOrgWebhook,
    InstallGitHubRepoWebhook,
} from "../../command/github/InstallGitHubWebhook";
import { ListRepoLinks } from "../../command/slack/ListRepoLinks";
import { PushToPushLifecycle } from "../push/PushToPushLifecycle";

@EventHandler("Display an unlink message when a channel is linked", GraphQL.subscription("channelLinkCreated"))
@Tags("enrollment")
export class ChannelLinkCreated implements HandleEvent<graphql.ChannelLinkCreated.Subscription> {

    @Secret(Secrets.OrgToken)
    public orgToken: string;

    public handle(event: EventFired<graphql.ChannelLinkCreated.Subscription>,
                  ctx: HandlerContext): Promise<HandlerResult> {

        const channelName = event.data.ChannelLink[0].channel.name || event.data.ChannelLink[0].channel.normalizedName;
        const teamId = event.data.ChannelLink[0].channel.team.id;
        const repo = event.data.ChannelLink[0].repo;
        const repoLink = repoSlackLink(repo);
        const msgId = `channel_link/${channelName}`;

        // provider might be null for cases when there are no webhooks currently installed
        const providerType = _.get(event.data, "ChannelLink[0].repo.org.provider.providerType") || "github_com";

        const linkMsg = `${repoLink} is now linked to this channel. I will send activity from that \
repository here. To turn this off, type ${codeLine("@atomist repos")} and click the ${bold("Unlink")} button.`;

        const noRepoHookMsg = `${repoLink} is now linked to this channel. Unfortunately I'm not able to send \
activity from that repository here because there is no Webhook installed. \
Please use the button below to install a Webhook in your repository.`;

        const noHookMsg = `${repoLink} is now linked to this channel. Unfortunately I'm not able to send \
activity from that repository here because there is no Webhook installed. \
Please use one of the buttons below to install a Webhook in your repository or organization.`;

        if (providerType === "github_com" || providerType === "ghe") {
            const api = github.api(this.orgToken, apiUrl(repo));
            return api.repos.getHooks({
                owner: repo.owner,
                repo: repo.name,
            })
            .then(result => {
                return hookExists(result.data);
            }, () => {
                return false;
            })
            .then(exists => {
                if (exists) {
                    return true;
                } else if (repo.org.ownerType === "organization") {
                    return ctx.graphClient.query<graphql.Webhook.Query, graphql.Webhook.Variables>({
                        name: "webhook",
                        variables: { owner: repo.owner },
                    })
                        .then(result => {
                            return _.get(result, "GitHubOrgWebhook[0].url") != null;
                        })
                        .catch(() => {
                            return false;
                        });
                } else {
                    return false;
                }
            })
            .then(exists => {
                if (exists) {
                    return this.sendLinkMessage(teamId, channelName, linkMsg, msgId, ctx);
                } else {
                    let text;
                    if (repo.org.ownerType === "organization") {
                        text = noHookMsg;
                    } else {
                        text = noRepoHookMsg;
                    }
                    return ctx.messageClient.send(
                        warning("Channel Linked", text, ctx,
                            [...createActions(repo), createListRepoLinksAction(msgId)]),
                        addressSlackChannels(teamId, channelName),
                        { id: msgId, dashboard: false });
                }
            })
            .then(() => showLastPush(repo, this.orgToken, ctx))
            .then(success, failure);
        } else {
            return this.sendLinkMessage(teamId, channelName, linkMsg, msgId, ctx);
        }
    }

    private sendLinkMessage(teamId: string, channelName: string, linkMsg: string, msgId, ctx: HandlerContext) {
        const msg: SlackMessage = {
            attachments: [{
                author_icon: `https://images.atomist.com/rug/check-circle.gif?gif=${guid()}`,
                author_name: "Channel Linked",
                text: linkMsg,
                fallback: linkMsg,
                color: "#45B254",
                mrkdwn_in: ["text"],
                actions: [
                    createListRepoLinksAction(msgId),
                ],
            }],
        };
        return ctx.messageClient.send(msg, addressSlackChannels(teamId, channelName), { id: msgId, dashboard: false });
    }
}

export function hookExists(hooks: any[]): boolean {
    if (hooks && Array.isArray(hooks) && hooks.length > 0) {
        const urlRegexp = /^https:\/\/.+.atomist.+\/github\/teams.*$/;
        return hooks.filter(w => w.config && w.config.url)
            .some(w => urlRegexp.test(w.config.url));
    }
    return false;
}

function createActions(repo: graphql.ChannelLinkCreated.Repo): Action[] {
    const actions: Action[] = [];

    const repoHook = new InstallGitHubRepoWebhook();
    repoHook.owner = repo.owner;
    repoHook.repo = repo.name;
    actions.push(buttonForCommand({ text: "Install Repository Webhook"}, repoHook));

    if (repo.org.ownerType === "organization") {
        const orgHook = new InstallGitHubOrgWebhook();
        orgHook.owner = repo.owner;
        actions.push(buttonForCommand({ text: "Install Organization Webhook"}, orgHook));
    }

    return actions;
}

function createListRepoLinksAction(msgId: string): Action {
    const repoList = new ListRepoLinks();
    repoList.msgId = msgId;
    return buttonForCommand({ text: "List Repository Links" }, repoList);
}

function showLastPush(repo: graphql.ChannelLinkCreated.Repo, token: string, ctx: HandlerContext): Promise<any> {
    return ctx.graphClient.query<graphql.LastPushOnBranch.Query, graphql.LastPushOnBranch.Variables>({
            name: "lastPushOnBranch",
            variables: {
                owner: repo.owner,
                name: repo.name,
                branch: repo.defaultBranch,
            },
        })
        .then(result => {
            if (result) {
                return _.get(result, "Repo[0].branches[0].commit.pushes[0].id");
            }
            return null;
        })
        .then(id => {
            if (id) {
                return ctx.graphClient.query<graphql.PushById.Query, graphql.PushById.Variables>({
                    name: "pushById",
                    variables: {
                        id,
                    },
                });
            }
            return null;
        })
        .then(push => {
            if (push) {
                const handler = new PushToPushLifecycle();
                handler.orgToken = token;
                return handler.handle({
                    data: {
                        Push: _.cloneDeep(push.Push),
                    },
                    extensions: {
                        operationName: "PushToPushLifecycle",
                    },
                }, ctx);
            }
            return null;
        });
}
