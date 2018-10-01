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
    Success,
} from "@atomist/automation-client";
import { HandlerError } from "@atomist/automation-client/HandlerResult";
import { MessageOptions } from "@atomist/automation-client/spi/message/MessageClient";
import * as GitHubApi from "@octokit/rest";
import * as URL from "url";
import { error } from "../../../util/messages";

export const DefaultGitHubApiUrl = "https://api.github.com/";
export const DefaultGitHubUrl = "https://github.com/";

export function api(token: string, apiUrl: string = DefaultGitHubApiUrl): GitHubApi {
    // separate the url
    const url = URL.parse(apiUrl);

    const gitHubApi = new GitHubApi({
        host: url.hostname,
        // latest @octokit/rest can't deal with a single / as context; it will create invalid urls with //
        pathPrefix: url.pathname !== "/" ? url.pathname : undefined,
        protocol: url.protocol.slice(0, -1),
        port: +url.port,
    });

    gitHubApi.authenticate({ type: "token", token });
    return gitHubApi;
}

export function handleError(title: string,
                            err: any,
                            ctx: HandlerContext,
                            options?: MessageOptions): Promise<HandlerResult> | HandlerError {
    switch (err.code) {
        case 400:
        case 422:
            return ctx.messageClient.respond(
                error(
                    title,
                    "The request contained errors.",
                    ctx,
                ),
                options)
                .then(() => Success, failure);
        case 403:
        case 404:
            return ctx.messageClient.respond(
                error(
                    title,
                    "You are not authorized to access the requested resource.",
                    ctx,
                ),
                options)
                .then(() => Success, failure);
        default:
            if (err.message) {
                const body = JSON.parse(err.message);
                const message = body.message ? body.message : "Error occurred. Please contact support.";
                return ctx.messageClient.respond(
                    error(
                        title,
                        message.endsWith(".") ? message : `${message}.`,
                        ctx,
                    ),
                    options)
                    .then(() => Success, failure);
            }
            return failure(err);

    }
}
