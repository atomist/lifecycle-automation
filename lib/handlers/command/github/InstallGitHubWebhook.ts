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
    Secret,
    Secrets,
    Success,
    Tags,
} from "@atomist/automation-client";
import {
    CommandHandler,
    ConfigurableCommandHandler,
} from "@atomist/automation-client/lib/decorators";
import { HandleCommand } from "@atomist/automation-client/lib/HandleCommand";
import {
    codeLine,
    SlackMessage,
    url,
} from "@atomist/slack-messages";
import * as graphql from "../../../typings/types";
import {
    loadChatIdByChatId,
    loadChatTeam,
} from "../../../util/helpers";
import {
    error,
    success,
    warning,
} from "../../../util/messages";
import { sendUnMappedRepoMessage } from "../../event/push/PushToUnmappedRepo";
import { DefaultBotName } from "../slack/LinkRepo";
import * as github from "./gitHubApi";

@ConfigurableCommandHandler("Install webhook for a whole organization", {
    intent: [ "install org-webhook", "install github org-webhook" ],
    autoSubmit: true,
})
@Tags("github", "webhook")
export class InstallGitHubOrgWebhook implements HandleCommand {

    @MappedParameter(MappedParameters.GitHubOwner)
    public owner: string;

    @MappedParameter(MappedParameters.GitHubWebHookUrl)
    public url: string;

    @MappedParameter(MappedParameters.GitHubApiUrl)
    public apiUrl: string;

    @MappedParameter(MappedParameters.GitHubUrl)
    public webUrl: string;

    @MappedParameter(MappedParameters.GitHubUserLogin)
    public login: string;

    @MappedParameter(MappedParameters.GitHubRepositoryProvider)
    public provider: string;

    @Secret(Secrets.userToken("admin:org_hook"))
    public githubToken: string;

    public handle(ctx: HandlerContext): Promise<HandlerResult> {

        const payload = {
            org: this.owner,
            name: "web",
            events: ["*"],
            active: true,
            config: {
                url: this.url,
                content_type: "json",
            },
        };

        return (github.api(this.githubToken, this.apiUrl).orgs as any).createHook(payload)
            .then(result => {
                return ctx.graphClient.mutate<graphql.SetOwnerLogin.Mutation,
                        graphql.SetOwnerLogin.Variables>({
                        name: "setOwnerLogin",
                        variables: {
                            login: this.login,
                            owner: this.owner,
                            providerId: this.provider,
                        },
                    })
                    .then(() => ctx.messageClient.respond(
                        success("Organization Webhook", `Successfully installed webhook for ${url(
                        orgHookUrl(this.webUrl, this.owner), codeLine(this.owner))}`)))
                    .then(() => result)
                    .catch(failure);
            })
            .catch(result => {
                return ctx.messageClient.respond(handleResponse(result, this.webUrl, this.owner, ctx))
                    .then(() => Success, failure);
            });
    }
}

@ConfigurableCommandHandler("Install webhook for a repository", {
    intent: [ "install webhook", "install github webhook" ],
    autoSubmit: true,
})
@Tags("github", "webhook")
export class InstallGitHubRepoWebhook implements HandleCommand {

    @MappedParameter(MappedParameters.GitHubOwnerWithUser)
    public owner: string;

    @MappedParameter(MappedParameters.GitHubRepository)
    public repo: string;

    @MappedParameter(MappedParameters.GitHubWebHookUrl)
    public url: string;

    @MappedParameter(MappedParameters.GitHubApiUrl)
    public apiUrl: string;

    @MappedParameter(MappedParameters.GitHubUrl)
    public webUrl: string;

    @MappedParameter(MappedParameters.SlackUser)
    public requester: string;

    @MappedParameter(MappedParameters.SlackTeam)
    public teamId: string;

    @MappedParameter(MappedParameters.GitHubUserLogin)
    public login: string;

    @MappedParameter(MappedParameters.GitHubRepositoryProvider)
    public provider: string;

    @Secret(Secrets.userToken("repo"))
    public githubToken: string;

    public handle(ctx: HandlerContext): Promise<HandlerResult> {

        const payload = {
            owner: this.owner,
            repo: this.repo,
            name: "web",
            events: ["*"],
            active: true,
            config: {
                url: this.url,
                content_type: "json",
            },
        };

        return (github.api(this.githubToken, this.apiUrl).repos as any).createHook(payload)
            .then(() => setRepoLogin(this.owner, this.repo, this.login, this.provider, ctx))
            .then(() => {
                return ctx.messageClient.respond(
                    success("Repository Webhook",
                        `Successfully installed repository webhook for ${url(
                            orgHookUrl(this.webUrl, this.owner, this.repo),
                            codeLine(`${this.owner}/${this.repo}`))}`))
                    .then(() => Promise.all([
                        loadChatIdByChatId(this.requester, this.teamId, ctx),
                        loadChatTeam(this.teamId, ctx),
                    ]))
                    .then(results => {
                        if (results[0] && results[1]) {
                            const chatTeam = results[1];
                            const alreadyMapped = (chatTeam.channels || []).some(c => (c.repos || [])
                                .some(r => r.name === this.repo && r.owner === this.owner));

                            if (!alreadyMapped) {

                                const repo: graphql.PushToUnmappedRepo.Repo = {
                                    owner: this.owner,
                                    name: this.repo,
                                    org: {
                                        team: {
                                            chatTeams: [{
                                                id: this.teamId,
                                                channels: results[1].channels,
                                            }],
                                        },
                                        provider: {},
                                    },
                                };
                                const botNames = {};
                                botNames[this.teamId] = DefaultBotName;

                                return sendUnMappedRepoMessage([results[0]], repo, ctx, botNames);
                            }
                        }
                        return Success;
                    })
                    .catch(failure);
            })
            .catch(result => {
                return ctx.messageClient.respond(handleResponse(result, this.webUrl, this.owner, ctx, this.repo))
                    .then(() => Success, failure);
            });
    }
}

@CommandHandler("Install webhook for a repositories")
@Tags("github", "webhook")
export class InstallGitHubReposWebhook implements HandleCommand {

    @Parameter({
        displayName: "repositories",
        description: "comma separated list of repository names",
        required: true})
    public repos: string;

    @MappedParameter(MappedParameters.GitHubOwner)
    public owner: string;

    @MappedParameter(MappedParameters.GitHubWebHookUrl)
    public url: string;

    @MappedParameter(MappedParameters.GitHubApiUrl)
    public apiUrl: string;

    @MappedParameter(MappedParameters.GitHubUserLogin)
    public login: string;

    @MappedParameter(MappedParameters.GitHubRepositoryProvider)
    public provider: string;

    @Secret(Secrets.userToken("repo"))
    public githubToken: string;

    public handle(ctx: HandlerContext): Promise<HandlerResult> {
        const o = this.owner;
        const promises = this.repos.split(",").map(r => () => {
            const payload = {
                owner: o,
                repo: r.trim(),
                name: "web",
                events: ["*"],
                active: true,
                config: {
                    url: this.url,
                    content_type: "json",
                },
            };
            return (github.api(this.githubToken, this.apiUrl).repos as any).createHook(payload)
                .then(() => setRepoLogin(this.owner, r, this.login, this.provider, ctx));
        });
        return promises.reduce((p, f) => p.then(f), Promise.resolve())
            .then(() => Success, failure);
    }
}

function handleResponse(response: any,
                        webUrl: string,
                        owner: string,
                        ctx: HandlerContext,
                        repo?: string): string | SlackMessage {
    const body = JSON.parse(response.message);
    const errors = body.errors;
    if (errors != undefined && errors.length > 0) {
        if (errors[0].message === "Hook already exists on this organization") {
            return warning("Organization Webhook",
                `Webhook already installed for ${url(orgHookUrl(webUrl, owner, repo),
                    codeLine(owner))}`, ctx);
        }
        if (errors[0].message === "Hook already exists on this repository") {
            return warning("Repository Webhook",
                `Webhook already installed for ${url(orgHookUrl(webUrl, owner, repo),
                    codeLine(`${owner}/${repo}`))}`, ctx);
        }
        return error(repo ? "Repository Webhook" : "Organization Webhook",
            `Failed to install webhook: ${errors[0].message}`, ctx);
    } else {
        return error(repo ? "Repository Webhook" : "Organization Webhook",
            `Failed to install webhook: ${body.message}`, ctx);
    }
}

function orgHookUrl(webUrl: string, owner: string, repo?: string): string {
    if (repo) {
        return `${webUrl}/${owner}/${repo}/settings/hooks`;
    } else {
        return `${webUrl}/organizations/${owner}/settings/hooks`;
    }
}

function setRepoLogin(owner: string,
                      repo: string,
                      login: string,
                      providerId: string,
                      ctx: HandlerContext): Promise<any> {
    return ctx.graphClient.mutate<graphql.SetRepoLogin.Mutation,
            graphql.SetRepoLogin.Variables>({
            name: "setRepoLogin",
            variables: {
                login,
                owner,
                repo: repo.trim(),
                providerId,
            },
        })
        .catch(failure);
}
