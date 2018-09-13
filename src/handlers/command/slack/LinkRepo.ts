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
    ConfigurableCommandHandler,
    failure,
    HandleCommand,
    HandlerContext,
    HandlerResult,
    MappedParameter,
    MappedParameters,
    Parameter,
    Success,
    Tags,
} from "@atomist/automation-client";
import * as slack from "@atomist/slack-messages";
import { LinkSlackChannelToRepo } from "../../../typings/types";
import { isChannel, isSlack } from "../../../util/slack";
import {
    checkRepo,
    noRepoMessage,
} from "./AssociateRepo";

export const DefaultBotName = "atomist";

export function linkSlackChannelToRepo(
    ctx: HandlerContext,
    teamId: string,
    channelId: string,
    repo: string,
    owner: string,
    providerId: string,
): Promise<LinkSlackChannelToRepo.Mutation> {

    return ctx.graphClient.mutate<LinkSlackChannelToRepo.Mutation, LinkSlackChannelToRepo.Variables>({
            name: "linkSlackChannelToRepo",
            variables: {
                teamId,
                channelId,
                repo,
                owner,
                providerId,
            },
        });
}

@ConfigurableCommandHandler("Link a repository and channel", {
    intent: ["repo", "link repo", "link repository"],
    autoSubmit: true,
})
@Tags("slack", "repo")
export class LinkRepo implements HandleCommand {

    public static linkRepoCommand(
        botName: string = DefaultBotName,
        owner: string = "OWNER",
        repo: string = "REPO",
    ): string {

        return `@${botName} repo owner=${owner} name=${repo}`;
    }

    @MappedParameter(MappedParameters.SlackTeam)
    public teamId: string;

    @MappedParameter(MappedParameters.SlackChannel)
    public channelId: string;

    @MappedParameter(MappedParameters.SlackChannelName)
    public channelName: string;

    @MappedParameter(MappedParameters.GitHubOwnerWithUser)
    public owner: string;

    @MappedParameter(MappedParameters.GitHubApiUrl)
    public apiUrl: string;

    @MappedParameter(MappedParameters.GitHubRepositoryProvider)
    public provider: string;

    @MappedParameter(MappedParameters.GitHubAllRepositories)
    public name: string;

    @Parameter({ pattern: /^\S*$/, displayable: false, required: false })
    public msgId: string;

    @Parameter({ pattern: /^[\S\s]*$/, displayable: false, required: false })
    public msg: string = "";

    public handle(ctx: HandlerContext): Promise<HandlerResult> {
        if (isSlack(this.channelId) && !isChannel(this.channelId)) {
            const err = "The Atomist Bot can only link repositories to public or private channels. " +
                "Please try again in a public or private channel.";
            return ctx.messageClient.addressChannels(err, this.channelName)
                .then(() => Success, failure);
        }
        return checkRepo(this.apiUrl, this.provider, this.name, this.owner, ctx)
            .then(repoExists => {
                if (!repoExists) {
                    return ctx.messageClient.respond(noRepoMessage(this.name, this.owner, ctx), { dashboard: false });
                }
                return linkSlackChannelToRepo(
                    ctx, this.teamId, this.channelId, this.name, this.owner, this.provider)
                    .then(() => {
                        if (this.msgId) {
                            return ctx.messageClient.addressChannels(
                                this.msg, this.channelName, { id: this.msgId, dashboard: false });
                        }
                        return Success;
                    });
            })
            .then(() => Success, failure);
    }

}
