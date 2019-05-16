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
    Destination,
    MessageOptions,
    SlackDestination,
} from "@atomist/automation-client";
import { SlackMessage } from "@atomist/slack-messages";
import "mocha";
import assert = require("power-assert");
import { channelLinkCreated } from "../../../../lib/handlers/event/channellink/ChannelLinkCreated";
import * as graphql from "../../../../lib/typings/types";

describe("ChannelLinkCreated", () => {

    const handler = channelLinkCreated().listener;

    it("should generate a message", done => {
        const event = {
            data: {
                ChannelLink: [{
                    channel: {
                        name: "automation-clj",
                        normalizedName: "automation-clj",
                        team: {
                            id: "T1L0VDKJP",
                        },
                    },
                    repo: {
                        name: "automation-clj",
                        owner: "atomisthq",
                        org: {
                            ownerType: "organization" as graphql.OwnerType,
                            provider: {
                                providerType: "github_com" as graphql.ProviderType,
                            },
                        },
                    },
                }],
            },
            extensions: {
                operationName: "ChannelLinkCreated",
            },
        };

        let messageSend = false;
        const ctx: any = {
            messageClient: {
                send(msg: any, destinations: Destination, options?: MessageOptions): Promise<any> {
                    assert((destinations as SlackDestination).channels[0] === "automation-clj");
                    const sm = msg as SlackMessage;
                    assert(sm.attachments[0].text.indexOf("atomisthq/automation-clj") >= 0);
                    assert(sm.attachments[0].actions.length === 1);
                    assert(sm.attachments[0].actions[0].text === "List Repository Links");
                    messageSend = true;
                    return Promise.resolve();
                },
            },
            graphClient: {
                query() {
                    return Promise.resolve({
                       GitHubOrgWebhook: [
                           {
                               url: "https://webhook.atomist.com/atomist/github/teams/T147DUZJP/zjlmxjzwhurspem",
                               webhookType: "organization",
                               org: {
                                   owner: "atomisthq",
                               },
                           },
                       ],
                    });
                },
            },
        };

        handler(event, ctx, {})
            .then(result => {
                assert(result.code === 0);
                assert(messageSend);
                done();
            });
    });

});
