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
    Parameter,
    Success,
    Tags,
} from "@atomist/automation-client";
import { CommandHandler } from "@atomist/automation-client/lib/decorators";
import { HandleCommand } from "@atomist/automation-client/lib/HandleCommand";
import * as slack from "@atomist/slack-messages";
import { codeLine } from "@atomist/slack-messages";
import * as graphql from "../../../typings/types";
import { success } from "../../../util/messages";
import {
    checkRepo,
    noRepoMessage,
} from "./AssociateRepo";

@CommandHandler("Unlink a repository and channel")
@Tags("slack", "repo")
export class UnlinkRepo implements HandleCommand {

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

    @Parameter({
        displayName: "Repository Name",
        description: "name of the repository to link",
        pattern: /^[-.\w]+$/,
        minLength: 1,
        maxLength: 100,
        required: true,
    })
    public name: string;

    @Parameter({ pattern: /^\S*$/, displayable: false, required: false })
    public msgId: string;

    public handle(ctx: HandlerContext): Promise<HandlerResult> {
        return checkRepo(this.apiUrl, this.provider, this.name, this.owner, ctx)
            .then(repoExists => {
                if (!repoExists) {
                    return ctx.messageClient.respond(noRepoMessage(this.name, this.owner, ctx));
                } else {
                    return ctx.graphClient.mutate<graphql.UnlinkSlackChannelFromRepo.Mutation,
                            graphql.UnlinkSlackChannelFromRepo.Variables>({
                            name: "unlinkSlackChannelFromRepo",
                            variables: {
                                teamId: this.teamId,
                                channelId: this.channelId,
                                repo: this.name,
                                owner: this.owner,
                                providerId: this.provider,
                            },
                        })
                        .then(() => {
                            const text = `Successfully unlinked repository ${
                                codeLine(`${this.owner}/${this.name}`)} from this channel`;
                            const msg = success("Unlink Repository", text);
                            return ctx.messageClient.respond(msg, { id: this.msgId, dashboard: false });
                        });
                }
            })
            .then(() => Success, failure);
    }

}
