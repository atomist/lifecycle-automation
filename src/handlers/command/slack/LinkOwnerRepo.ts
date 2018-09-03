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
import { DefaultGitHubApiUrl } from "../github/gitHubApi";
import { LinkRepo } from "./LinkRepo";

@CommandHandler("Link a repository, provided as an owner/repo|api slug, and channel")
@Tags("slack", "repo")
export class LinkOwnerRepo implements HandleCommand {

    @MappedParameter(MappedParameters.SlackChannel)
    public channelId: string;

    @MappedParameter(MappedParameters.SlackChannelName)
    public channelName: string;

    @Secret(Secrets.userToken("repo"))
    public githubToken: string;

    @Parameter({
        displayName: "Repository Slug",
        description: "'owner/name' of the repository to link",
        pattern: /^[-.\w]+\/[-.\w]+\|\S*$/,
        minLength: 1,
        maxLength: 512,
        required: true,
    })
    public slug: string;

    @Parameter({ pattern: /^\S*$/, displayable: false, required: false })
    public msgId: string;

    @Parameter({ pattern: /^[\S\s]*$/, displayable: false, required: false })
    public msg: string = "";

    public handle(ctx: HandlerContext): Promise<HandlerResult> {
        const slugApiParts = this.slug.split("|");
        if (!slugApiParts || slugApiParts.length !== 2 || !slugApiParts[0]) {
            const err = `failed to parse slug '${this.slug}' into slug and API, ` +
                `not linking to #${this.channelName}`;
            logger.error(err);
            return ctx.messageClient.respond(err)
                .then(() => Success, failure);
        }
        const apiUrl = (slugApiParts[1]) ? slugApiParts[1] : DefaultGitHubApiUrl;
        const slugParts = slugApiParts[0].split("/");
        if (!slugParts || slugParts.length !== 2 || !slugParts[0] || !slugParts[1]) {
            const err = `failed to parse repo slug '${slugApiParts[0]}' into owner and name, ` +
                `not linking to #${this.channelName}`;
            logger.error(err);
            return ctx.messageClient.respond(err)
                .then(() => Success, failure);
        }
        const owner = slugParts[0];
        const name = slugParts[1];
        const linkRepo = new LinkRepo();
        linkRepo.channelId = this.channelId;
        linkRepo.channelName = this.channelName;
        linkRepo.apiUrl = apiUrl;
        linkRepo.name = name;
        linkRepo.owner = owner;
        linkRepo.msgId = this.msgId;
        linkRepo.msg = this.msg;

        return linkRepo.handle(ctx)
            .then(() => Success, failure);
    }
}
