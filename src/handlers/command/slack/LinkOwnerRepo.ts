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
    CommandHandler,
    failure,
    HandleCommand,
    HandlerContext,
    HandlerResult,
    logger,
    MappedParameter,
    MappedParameters,
    Parameter,
    Secret,
    Secrets,
    Success,
    Tags,
} from "@atomist/automation-client";
import * as slack from "@atomist/slack-messages";
import {
    DefaultGitHubApiUrl,
    DefaultGitHubProviderId,
} from "../github/gitHubApi";
import { LinkRepo } from "./LinkRepo";

export interface RepoProvider {
    name: string;
    owner: string;
    apiUrl: string;
    providerId: string;
}

@CommandHandler("Link a repository, provided as an owner/repo|api slug, and channel")
@Tags("slack", "repo")
export class LinkOwnerRepo implements HandleCommand {

    @MappedParameter(MappedParameters.SlackTeam)
    public teamId: string;

    @MappedParameter(MappedParameters.SlackChannel)
    public channelId: string;

    @MappedParameter(MappedParameters.SlackChannelName)
    public channelName: string;

    @Secret(Secrets.userToken("repo"))
    public githubToken: string;

    @Parameter({
        displayName: "Stringified Repository API Provider object ",
        description: `'{"owner":"OWNER","name":"NAME","apiUrl":"URL","providerId":"ID"}' of the repository to link`,
        pattern: /^[\s\S]+$/,
        minLength: 20,
        maxLength: 1024,
        required: true,
    })
    public repoProvider: string;

    @Parameter({ pattern: /^\S*$/, displayable: false, required: false })
    public msgId: string;

    @Parameter({ pattern: /^[\S\s]*$/, displayable: false, required: false })
    public msg: string = "";

    public handle(ctx: HandlerContext): Promise<HandlerResult> {
        let repo: RepoProvider;
        try {
            repo = JSON.parse(this.repoProvider);
        } catch (e) {
            const err = `Failed to parse repo-provider '${this.repoProvider}' into repo and provider, ` +
                `not linking to #${this.channelName}`;
            logger.error(err);
            return ctx.messageClient.respond(err)
                .then(() => Success, failure);
        }
        const apiUrl = (repo.apiUrl) ? repo.apiUrl : DefaultGitHubApiUrl;
        const providerId = (repo.providerId) ? repo.providerId : DefaultGitHubProviderId;
        const linkRepo = new LinkRepo();
        linkRepo.teamId = this.teamId;
        linkRepo.channelId = this.channelId;
        linkRepo.channelName = this.channelName;
        linkRepo.owner = repo.owner;
        linkRepo.apiUrl = apiUrl;
        linkRepo.provider = providerId;
        linkRepo.name = repo.name;
        linkRepo.msgId = this.msgId;
        linkRepo.msg = this.msg;

        return linkRepo.handle(ctx)
            .then(() => Success, failure);
    }
}
