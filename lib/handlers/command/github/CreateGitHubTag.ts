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
    Parameters,
    Secret,
    Secrets,
    Success,
    Tags,
} from "@atomist/automation-client";
import { guid } from "@atomist/automation-client/internal/util/string";
import { commandHandlerFrom } from "@atomist/automation-client/onCommand";
import { buttonForCommand } from "@atomist/automation-client/spi/message/MessageClient";
import {
    bold,
    codeLine,
    SlackMessage,
} from "@atomist/slack-messages";
import * as _ from "lodash";
import * as semver from "semver";
import * as graphql from "../../../typings/types";
import { success } from "../../../util/messages";
import * as github from "./gitHubApi";
import { OwnerParameters } from "./targetOrgAndRepo";

@ConfigurableCommandHandler("Create a tag on GitHub", {
    intent: [ "create tag", "create github tag" ],
    autoSubmit: true,
})
@Tags("github", "tag")
export class CreateGitHubTag implements HandleCommand {

    @Parameter({
        displayName: "Tag",
        description: "tag to create",
        pattern: /^\w(?:[-.\w/]*\w)*$/,
        validInput: "valid git tag, starting and ending with a alphanumeric character and containing alphanumeric,"
        + "_, -, ., and / characters",
        minLength: 1,
        maxLength: 100,
    })
    public tag: string;

    @Parameter({
        displayName: "SHA",
        description: "commit SHA to create tag on",
        pattern: /^[a-f0-9]+$/,
        validInput: "",
        minLength: 7,
        maxLength: 40,
    })
    public sha: string;

    @Parameter({
        displayName: "Message",
        description: "message for the annotated tag",
        pattern: /^.*$/,
        validInput: "arbitrary string",
        minLength: 0,
        maxLength: 200,
        required: false,
    })
    public message: string = "";

    @Parameter({ description: "message id", required: false, displayable: false })
    public msgId: string;

    @MappedParameter(MappedParameters.GitHubRepository)
    public repo: string;

    @MappedParameter(MappedParameters.GitHubOwner)
    public owner: string;

    @MappedParameter(MappedParameters.GitHubApiUrl)
    public apiUrl: string;

    @MappedParameter(MappedParameters.SlackUser, false)
    public requester: string;

    @MappedParameter(MappedParameters.SlackTeam, false)
    public teamId: string;

    @Secret(Secrets.userToken("repo"))
    public githubToken: string;

    public handle(ctx: HandlerContext): Promise<HandlerResult> {

        return ctx.graphClient.query<graphql.ChatId.Query, graphql.ChatId.Variables>({
                name: "chatId",
                variables: {
                    teamId: this.teamId,
                    chatId: this.requester,
                },
            })
            .then(result => {
                const person = _.get(result, "ChatTeam[0].members[0].person") as graphql.ChatId.Person;
                if (person) {
                    return person;
                } else {
                    return null;
                }
            })
            .then(person => {
                const tagger = {
                    name: person.gitHubId && person.gitHubId.name ? person.gitHubId.name : "Atomist Bot",
                    email: person.emails && person.emails.length > 0 ? person.emails[0].address : "bot@atomist.com",
                    date: new Date().toISOString(),
                };
                return (github.api(this.githubToken, this.apiUrl).gitdata as any).createTag({
                    owner: this.owner,
                    repo: this.repo,
                    tag: this.tag,
                    message: this.message || "Tag created by Atomist Lifecycle Automation",
                    object: this.sha,
                    type: "commit",
                    tagger,
                });
            })
            .then(() => {
                return github.api(this.githubToken, this.apiUrl).gitdata.createReference({
                    owner: this.owner,
                    repo: this.repo,
                    ref: `refs/tags/${this.tag}`,
                    sha: this.sha,
                });
            })
            .then(() => {
                if (this.msgId) {
                    return ctx.messageClient.respond(success(
                        "Create Tag",
                        `Successfully created new tag ${codeLine(this.tag)} on commit ${
                            codeLine(this.sha.slice(0, 6))}`),
                        { id: this.msgId });
                }
            })
            .then(() => Success)
            .catch(err => {
                return github.handleError("Create Tag", err, ctx);
            });
    }
}

@Parameters()
export class TagParameters extends OwnerParameters {

    @Parameter({
        displayName: "SHA",
        description: "commit SHA to create tag on",
        pattern: /^[a-f0-9]+$/,
        validInput: "",
        minLength: 7,
        maxLength: 40,
    })
    public sha: string;

    @Parameter({
        displayName: "Message",
        description: "message for the annotated tag",
        pattern: /^.*$/,
        validInput: "arbitrary string",
        minLength: 0,
        maxLength: 200,
        required: false,
    })
    public message: string = "";

    @Parameter({
        displayName: "Tag",
        description: "tag to create",
        pattern: /^\w(?:[-.\w/]*\w)*$/,
        validInput: "valid git tag, starting and ending with a alphanumeric character and containing alphanumeric,"
        + "_, -, ., and / characters",
        minLength: 1,
        maxLength: 100,
    })
    public lastTag: string;

}

export function tagSelection() {
    return async (ctx: HandlerContext, params: TagParameters): Promise<HandlerResult> => {
        if (!params.msgId) {
            params.msgId = guid();
        }

        if (semver.valid(params.lastTag)) {
            const majorTag = semver.coerce(params.lastTag).inc("major");
            const minorTag = semver.coerce(params.lastTag).inc("minor");
            const patchTag = semver.coerce(params.lastTag).inc("patch");

            const msg: SlackMessage = {
                text: `Create new tag on commit ${codeLine(params.sha.slice(0, 6))}`,
                attachments: [{
                    fallback: "Tag actions",
                    text: `Last tag on ${bold(`${params.owner}/${params.repo}`)} is ${codeLine(params.lastTag)}`,
                    mrkdwn_in: ["text"],
                    actions: [
                        buttonForCommand(
                           { text: `Tag ${majorTag.format()}` },
                           "CreateGitHubTag",
                           {
                               ...params,
                               tag: majorTag.format(),
                           }),
                        buttonForCommand(
                           { text: `Tag ${minorTag.format()}` },
                           "CreateGitHubTag",
                           {
                               ...params,
                               tag: minorTag.format(),
                           }),
                        buttonForCommand(
                           { text: `Tag ${patchTag.format()}` },
                           "CreateGitHubTag",
                           {
                               ...params,
                               tag: patchTag.format(),
                           }),
                        buttonForCommand(
                            { text: `New Tag` },
                            "CreateGitHubTag",
                            {
                                ...params,
                            }),
                    ],
                }, {
                    fallback: "Cancel",
                    actions: [
                        buttonForCommand(
                        { text: `Cancel` },
                        "cancelConversation",
                        {
                            msgId: params.msgId,
                            title: "Create Tag",
                            text: "Canceled tag creation",
                        }),
                    ],
                }],
            };
            return ctx.messageClient.respond(msg, { id: params.msgId })
                .then(() => Success, failure);
        }
    };
}

export function createGitHubTagSelection(): HandleCommand<TagParameters> {
    return commandHandlerFrom(
        tagSelection(),
        TagParameters,
        "createGitHubTagSelection",
        "Create a tag on GitHub",
        [],
    );
}
