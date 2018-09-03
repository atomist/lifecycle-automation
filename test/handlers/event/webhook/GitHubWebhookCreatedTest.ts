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

import "mocha";
import assert = require("power-assert");

import { MessageOptions, SlackDestination } from "@atomist/automation-client/spi/message/MessageClient";
import { Destination } from "@atomist/automation-client/spi/message/MessageClient";
import { SlackMessage } from "@atomist/slack-messages";
import { GitHubWebhookCreated } from "../../../../src/handlers/event/webhook/GitHubWebhookCreated";

describe("GitHubWebhookCreated", () => {

    const handler = new GitHubWebhookCreated();

    it("should generate a message with buttons if there are matching channels", done => {
        const event = {
            data: {
                Webhook: [{
                    org: {
                        owner: "test-org",
                        team: {
                            chatTeams: [{
                                members: [
                                    {
                                        isOwner: "true",
                                        screenName: "cd",
                                    },
                                ],
                                channels: [
                                    {
                                        name: "dev",
                                        channelId: "C7UR196MB",
                                    },
                                    {
                                        name: "build-automations",
                                        channelId: "C7TT99Y10",
                                    },
                                    {
                                        name: "engineering",
                                        channelId: "D18G4L88J",
                                    },
                                ],
                            }],
                        },
                    },
                }],
            },
            extensions: {
                operationName: "GitHubWebhookCreated",
            },
        };

        let messageSend = false;
        const ctx: any = {
            messageClient: {
                send(msg: any, destinations: Destination, options?: MessageOptions): Promise<any> {
                    assert((destinations as SlackDestination).users[0] === "cd");
                    const sm = msg as SlackMessage;
                    assert(sm.attachments[0].actions.length === 2);
                    assert(sm.attachments[0].actions[0].text === "#dev");
                    assert((sm.attachments[0].actions[0] as any).command.parameters.channelId === "C7UR196MB");

                    assert(sm.attachments[0].actions[1].text === "#engineering");
                    assert((sm.attachments[0].actions[1] as any).command.parameters.channelId === "D18G4L88J");
                    assert.equal(options.id, `webhook/create/test-org`);
                    messageSend = true;
                    return Promise.resolve();
                },
            },
        };

        handler.handle(event, ctx)
            .then(result => {
                assert(result.code === 0);
                assert(messageSend);
            })
            .then(done, done);
    });

    it("should generate a message if there are no channels", done => {
        const event = {
            data: {
                Webhook: [{
                    name: "test-owner",
                    org: {
                        team: {
                            chatTeams: [{
                                members: [
                                    {
                                        isOwner: "true",
                                        screenName: "cd",
                                    },
                                ],
                                channels: [
                                    {
                                        name: "general",
                                        channelId: "C7UR196MB",
                                    },
                                    {
                                        name: "build-automations",
                                        channelId: "C7TT99Y10",
                                    },
                                    {
                                        name: "random",
                                        channelId: "D18G4L88J",
                                    },
                                ],
                            }],
                        },
                    },
                }],
            },
            extensions: {
                operationName: "GitHubWebhookCreated",
            },
        };

        let messageSend = false;
        const ctx: any = {
            messageClient: {
                send(msg: any, destinations: Destination, options?: MessageOptions): Promise<any> {
                    assert((destinations as SlackDestination).users[0] === "cd");
                    const sm = msg as SlackMessage;
                    assert(!sm.attachments[0].actions);
                    messageSend = true;
                    return Promise.resolve();
                },
            },
        };

        handler.handle(event, ctx)
            .then(result => {
                assert(result.code === 0);
                assert(messageSend);
            })
            .then(done, done);
    });

    it("should generate a message if there are null channels", done => {
        const event = {
            data: {
                Webhook: [{
                    org: {
                        team: {
                            chatTeams: [{
                                members: [
                                    {
                                        isOwner: "true",
                                        screenName: "cd",
                                    },
                                ],
                                channels: null,
                            }],
                        },
                    },
                }],
            },
            extensions: {
                operationName: "GitHubWebhookCreated",
            },
        };

        let messageSend = false;
        const ctx: any = {
            messageClient: {
                send(msg: any, destinations: Destination, options?: MessageOptions): Promise<any> {
                    assert((destinations as SlackDestination).users[0] === "cd");
                    const sm = msg as SlackMessage;
                    assert(!sm.attachments[0].actions);
                    messageSend = true;
                    return Promise.resolve();
                },
            },
        };

        handler.handle(event, ctx)
            .then(result => {
                assert(result.code === 0);
                assert(messageSend);
            })
            .then(done, done);
    });

    it("should generate a message if channels is undefined", done => {
        const event = {
            data: {
                Webhook: [{
                    org: {
                        team: {
                            chatTeams: [{
                                members: [
                                    {
                                        isOwner: "true",
                                        screenName: "cd",
                                    },
                                ],
                                channels: undefined,
                            }],
                        },
                    },
                }],
            },
            extensions: {
                operationName: "GitHubWebhookCreated",
            },
        };

        let messageSend = false;
        const ctx: any = {
            messageClient: {
                send(msg: any, destinations: Destination, options?: MessageOptions): Promise<any> {
                    assert((destinations as SlackDestination).users[0] === "cd");
                    const sm = msg as SlackMessage;
                    assert(!sm.attachments[0].actions);
                    messageSend = true;
                    return Promise.resolve();
                },
            },
        };

        handler.handle(event, ctx)
            .then(result => {
                assert(result.code === 0);
                assert(messageSend);
            })
            .then(done, done);
    });
});
