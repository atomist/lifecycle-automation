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
import * as assert from "power-assert";

import * as slack from "@atomist/slack-messages";

import {
    DefaultGitHubApiUrl,
    DefaultGitHubProviderId,
} from "../../../../src/handlers/command/github/gitHubApi";
import { DefaultBotName } from "../../../../src/handlers/command/slack/LinkRepo";
import {
    extractScreenNameFromMapRepoMessageId,
    fuzzyRepoChannelMatch,
    leaveRepoUnmapped,
    mapRepoMessage,
    mapRepoMessageId,
    repoString,
} from "../../../../src/handlers/event/push/PushToUnmappedRepo";
import * as graphql from "../../../../src/typings/types";

describe("PushToUnmappedRepo", () => {

    describe("leaveRepoUnmapped", () => {

        const name = "james";
        const owner = "brown";
        const repo = { name, owner };

        it("should handle no preferences", () => {
            assert(leaveRepoUnmapped(repo, {}) === false);
        });

        it("should find the silenced repo", () => {
            const chatId = {
                preferences: [{
                    name: "repo_mapping_flow",
                    value: JSON.stringify({ disabled_repos: [`${owner}:${name}`] }),
                }],
            };
            assert(leaveRepoUnmapped(repo, chatId) === true);
        });

        it("should not find the unmapped repo", () => {
            const chatId = {
                preferences: [{
                    name: "repo_mapping_flow",
                    value: JSON.stringify({ disabled_repos: ["igot:you", "get:up"] }),
                }],
            };
            assert(leaveRepoUnmapped(repo, chatId) === false);
        });

        it("should find the repo among several", () => {
            const chatId = {
                preferences: [{
                    name: "repo_mapping_flow",
                    value: JSON.stringify({ disabled_repos: ["igot:you", `${owner}:${name}`, "get:up"] }),
                }],
            };
            assert(leaveRepoUnmapped(repo, chatId) === true);
        });

    });

    describe("repoString", () => {

        it("should return a slug", () => {
            const repo = { name: "first-person", owner: "gord-downie" };
            assert(repoString(repo) === "gord-downie:first-person");
        });

        it("should return a provider", () => {
            const repo = {
                name: "first-person",
                owner: "gord-downie",
                org: {
                    provider: {
                        providerId: "Introduce_Yerself",
                    },
                },
            };
            assert(repoString(repo) === "Introduce_Yerself:gord-downie:first-person");
        });

        it("should return something that matches nothing", () => {
            assert(repoString(undefined).indexOf(":") < 0);
        });

    });

    describe("mapRepoMessageId", () => {
        const owner = "alicia-keys";
        const repo = "girl-on-fire";
        const screenName = "augello";

        it("should provide a message ID with repo and screen name", () => {
            const id = mapRepoMessageId(owner, repo, screenName);
            assert(id.includes(owner));
            assert(id.includes(repo));
            assert(id.includes(screenName));
        });

        it("should return a message ID from which we can get a screen name", () => {
            assert(extractScreenNameFromMapRepoMessageId(mapRepoMessageId(owner, repo, screenName)) === screenName);
        });

        it("should return null for a null message ID", () => {
            assert(extractScreenNameFromMapRepoMessageId(null) === null);
        });

        it("should return null for a invalid message ID", () => {
            assert(extractScreenNameFromMapRepoMessageId("invalid/message") === null);
        });

    });

    describe("fuzzyRepoChannelMatch", () => {

        it("should find nothing", () => {
            const repo = "gram-parsons";
            const channels: graphql.PushToUnmappedRepo.Channels[] = [
                { name: "emmylou-harris" },
                { name: "chris-hillman" },
            ];
            assert(fuzzyRepoChannelMatch(repo, channels).length === 0);
        });

        it("should find a shorter match", () => {
            const repo = "gram-parsons";
            const channels: graphql.PushToUnmappedRepo.Channels[] = [
                { name: "emmylou-harris" },
                { name: "gram" },
                { name: "chris-hillman" },
            ];
            const matches = fuzzyRepoChannelMatch(repo, channels);
            assert(matches.length === 1);
            assert(matches[0].name === "gram");
        });

        it("should find a longer match", () => {
            const repo = "gram-parsons";
            const channels: graphql.PushToUnmappedRepo.Channels[] = [
                { name: "emmylou-harris" },
                { name: "gram-parsons-and-the-fallen-angels" },
                { name: "chris-hillman" },
            ];
            const matches = fuzzyRepoChannelMatch(repo, channels);
            assert(matches.length === 1);
            assert(matches[0].name === "gram-parsons-and-the-fallen-angels");
        });

        it("should find all matches", () => {
            const repo = "gram-parsons";
            const channels: graphql.PushToUnmappedRepo.Channels[] = [
                { name: "emmylou-harris" },
                { name: "gram-parsons-and-the-fallen-angels" },
                { name: "chris-hillman" },
                { name: "gram" },
            ];
            const matches = fuzzyRepoChannelMatch(repo, channels);
            assert(matches.length === 2);
            assert(matches[0].name === "gram");
            assert(matches[1].name === "gram-parsons-and-the-fallen-angels");
        });

        it("should find only two matches", () => {
            const repo = "gram-parsons";
            const channels: graphql.PushToUnmappedRepo.Channels[] = [
                { name: "parsons" },
                { name: "emmylou-harris" },
                { name: "gram-parsons-and-the-fallen-angels" },
                { name: "chris-hillman" },
                { name: "gram" },
                { name: "am" },
            ];
            const matches = fuzzyRepoChannelMatch(repo, channels);
            assert(matches.length === 2);
            assert(matches[0].name === "parsons");
            assert(matches[1].name === "gram");
        });

        it("should find the best two matches", () => {
            const repo = "gram-parsons";
            const channels: graphql.PushToUnmappedRepo.Channels[] = [
                { name: "parsons" },
                { name: "emmylou-harris" },
                { name: "gram-parsons-and-the-fallen-angels" },
                { name: "gram-parson" },
                { name: "chris-hillman" },
                { name: "gram" },
                { name: "gram-parsonsx" },
                { name: "gram-par" },
            ];
            const matches = fuzzyRepoChannelMatch(repo, channels);
            assert(matches.length === 2);
            assert(matches[0].name === "gram-parson");
            assert(matches[1].name === "gram-parsonsx");
        });

        it("should find the best two matches when some channel names are null", () => {
            const repo = "gram-parsons";
            const channels: graphql.PushToUnmappedRepo.Channels[] = [
                { name: "parsons" },
                { name: "emmylou-harris" },
                {},
                { name: "gram-parsons-and-the-fallen-angels" },
                { name: "gram-parson" },
                { name: "chris-hillman" },
                { name: "gram" },
                { name: null },
                { name: "gram-parsonsx" },
                { name: "gram-par" },
            ];
            const matches = fuzzyRepoChannelMatch(repo, channels);
            assert(matches.length === 2);
            assert(matches[0].name === "gram-parson");
            assert(matches[1].name === "gram-parsonsx");
        });

    });

    describe("mapRepoMessage", () => {

        function assertStop(stopMsg: slack.Attachment) {
            const stopText = "stop receiving similar suggestions for all repositories";
            assert(stopMsg.text.includes(stopText));
            assert(stopMsg.fallback.includes(stopText));
            assert(stopMsg.actions.length === 1);
            assert(stopMsg.actions[0].text === "All Repositories");
            assert(stopMsg.actions[0].type === "button");
            const allStopCmd = (stopMsg.actions[0] as any).command;
            assert(allStopCmd.name === "SetUserPreference");
            assert(allStopCmd.parameters.key === "dm");
            assert(allStopCmd.parameters.name === "disable_for_mapRepo");
            assert(allStopCmd.parameters.value === "true");
        }

        it("should send a message offering to create channel and link a repo to it", () => {
            const repo = {
                name: "sin-city",
                owner: "grievous-angel",
                channels: [],
                org: {
                    team: {
                        chatTeams: [{
                            id: "TEAMID",
                            channels: [{ channelId: "C1000WED", name: "1000-wedding" }],
                        }],
                    },
                },
            };
            const chatId = {
                screenName: "gram",
                preferences: [{
                    name: "repo_mapping_flow",
                    value: JSON.stringify({}),
                }],
                chatTeam: {
                    id: "TEAMID",
                },
            };
            const repoLink = "<https://github.com/grievous-angel/sin-city|grievous-angel/sin-city>";
            const msg = mapRepoMessage(repo, chatId, DefaultBotName);
            assert(msg.attachments.length === 3);
            const linkMsg = msg.attachments[0];
            const hintMsg = msg.attachments[1];
            const stopMsg = msg.attachments[2];
            assert(linkMsg.pretext.includes(repoLink));
            assert(linkMsg.actions.length === 2);
            assert(linkMsg.actions[0].text === `Create #sin-city`);
            assert(linkMsg.actions[0].type === "button");
            const command = (linkMsg.actions[0] as any).command;
            assert(command.name === "CreateChannel");
            assert(command.parameters.apiUrl === DefaultGitHubApiUrl);
            assert(command.parameters.channel === "sin-city");
            assert(command.parameters.owner === "grievous-angel");
            assert(command.parameters.repo === "sin-city");
            assert(linkMsg.actions[1].text === "Other channel...");
            assert(linkMsg.actions[1].type === "select");
            assert.deepEqual(linkMsg.actions[1].options, [{ text: "1000-wedding", value: "1000-wedding" }]);
            const menuCommand = (linkMsg.actions[1] as any).command;
            assert(menuCommand.name === "CreateChannel");
            assert(menuCommand.parameterName === "channel");
            assert(menuCommand.parameters.apiUrl === DefaultGitHubApiUrl);
            assert(menuCommand.parameters.channel === undefined);
            assert(menuCommand.parameters.owner === "grievous-angel");
            assert(menuCommand.parameters.repo === "sin-city");
            const hintFallBack = `or '/invite @atomist' me to a relevant channel and type
'@atomist repo owner=grievous-angel name=sin-city'`;
            assert(hintMsg.fallback === hintFallBack);
            assertStop(stopMsg);
        });

        it("should send a message offering to link a repo to existing channel", () => {
            const repo = {
                name: "sin-city",
                owner: "grievous-angel",
                channels: [],
                org: {
                    provider: {
                        providerId: "sierra_records",
                        apiUrl: "https://ghe.gram-parsons.com/v3/",
                        url: "https://ghe.gram-parsons.com/",
                    },
                    team: {
                        chatTeams: [{
                            id: "TEAMID",
                            channels: [
                                { channelId: "C1000WED", name: "1000-wedding" },
                                { channelId: "C51NC1TY", name: "sin-city" },
                                { channelId: "CBAL1M0RE", name: "streets-of-baltimore" },
                                { channelId: "CBRA55BUTT0N5", name: "brass-buttons" },
                            ],
                        }],
                    },
                },
            };
            const chatId = {
                screenName: "gram",
                preferences: [{
                    name: "repo_mapping_flow",
                    value: JSON.stringify({
                        disabled_repos: [
                            "sierra_records:grievous-angel:a-song-for-you",
                            "sierra_records:grievous-angel:in-my-hour-of-darkness",
                            "sierra_records:grievous-angel:return-of-the-grievous-angel",
                        ],
                    }),
                }],
                chatTeam: {
                    id: "TEAMID",
                },
            };
            const repoLink = "<https://ghe.gram-parsons.com/grievous-angel/sin-city|grievous-angel/sin-city>";
            const bot = "hillman";
            const msg = mapRepoMessage(repo, chatId, bot);
            assert(msg.attachments.length === 3);
            const linkMsg = msg.attachments[0];
            const hintMsg = msg.attachments[1];
            const stopMsg = msg.attachments[2];
            assert(linkMsg.pretext.indexOf(repoLink) > 0);
            assert(linkMsg.actions.length === 2);
            assert(linkMsg.actions[0].text === "#sin-city");
            assert(linkMsg.actions[0].type === "button");
            const command = (linkMsg.actions[0] as any).command;
            assert(command.name === "CreateChannel");
            assert(command.parameters.apiUrl === "https://ghe.gram-parsons.com/v3/");
            assert(command.parameters.channel === "sin-city");
            assert(command.parameters.owner === "grievous-angel");
            assert(command.parameters.repo === "sin-city");
            assert(linkMsg.actions[1].text === "Other channel...");
            assert(linkMsg.actions[1].type === "select");
            assert.deepEqual(linkMsg.actions[1].options, [
                { text: "1000-wedding", value: "1000-wedding" },
                { text: "brass-buttons", value: "brass-buttons" },
                { text: "sin-city", value: "sin-city" },
                { text: "streets-of-baltimore", value: "streets-of-baltimore" },
            ]);
            const menuCommand = (linkMsg.actions[1] as any).command;
            assert(menuCommand.name === "CreateChannel");
            assert(menuCommand.parameterName === "channel");
            assert(menuCommand.parameters.apiUrl === "https://ghe.gram-parsons.com/v3/");
            assert(menuCommand.parameters.channel === undefined);
            assert(menuCommand.parameters.owner === "grievous-angel");
            assert(menuCommand.parameters.repo === "sin-city");
            const hintFallBack = `or '/invite @${bot}' me to a relevant channel and type
'@${bot} repo owner=grievous-angel name=sin-city'`;
            assert(hintMsg.fallback === hintFallBack);
            assertStop(stopMsg);
        });

        it("should send a message with matchy channel buttons", () => {
            const repo = {
                name: "sin-city",
                owner: "grievous-angel",
                channels: [],
                org: {
                    team: {
                        chatTeams: [{
                            id: "TEAMID",
                            channels: [
                                { name: "1000-wedding", channelId: "C1000WED" },
                                { name: "sin-city-1", channelId: "C51NC1TY1" },
                                { name: "sin-city-21", channelId: "C51NC1TY21" },
                                { name: "streets-of-baltimore", channelId: "CBAL1M0RE" },
                                { name: "sin-city-2", channelId: "C51NC1TY2" },
                                { name: "brass-buttons", channelId: "CBRA55BUTT0N5" },
                            ],
                        }],
                    },
                },
            };
            const chatId = {
                screenName: "gram",
                preferences: [{
                    name: "repo_mapping_flow",
                    value: JSON.stringify({}),
                }],
                chatTeam: {
                    id: "TEAMID",
                },
            };
            const repoLink = "<https://github.com/grievous-angel/sin-city|grievous-angel/sin-city>";
            const msg = mapRepoMessage(repo, chatId, DefaultBotName);
            assert(msg.attachments.length === 3);
            const linkMsg = msg.attachments[0];
            const hintMsg = msg.attachments[1];
            const stopMsg = msg.attachments[2];
            assert(linkMsg.pretext.includes(repoLink));
            assert(linkMsg.actions.length === 4);
            assert(linkMsg.actions[0].text === `Create #sin-city`);
            assert(linkMsg.actions[0].type === "button");
            const command = (linkMsg.actions[0] as any).command;
            assert(command.name === "CreateChannel");
            assert(command.parameters.apiUrl === DefaultGitHubApiUrl);
            assert(command.parameters.channel === "sin-city");
            assert(command.parameters.owner === "grievous-angel");
            assert(command.parameters.repo === "sin-city");
            assert(linkMsg.actions[1].text === "#sin-city-1");
            assert(linkMsg.actions[1].type === "button");
            const cmd1 = (linkMsg.actions[1] as any).command;
            assert(cmd1.name === "CreateChannel");
            assert(cmd1.parameters.apiUrl === DefaultGitHubApiUrl);
            assert(cmd1.parameters.channel === "sin-city-1");
            assert(cmd1.parameters.owner === "grievous-angel");
            assert(cmd1.parameters.repo === "sin-city");
            assert(linkMsg.actions[2].text === "#sin-city-2");
            assert(linkMsg.actions[2].type === "button");
            const cmd2 = (linkMsg.actions[2] as any).command;
            assert(cmd2.name === "CreateChannel");
            assert(cmd2.parameters.apiUrl === DefaultGitHubApiUrl);
            assert(cmd2.parameters.channel === "sin-city-2");
            assert(cmd2.parameters.owner === "grievous-angel");
            assert(cmd2.parameters.repo === "sin-city");
            assert(linkMsg.actions[3].text === "Other channel...");
            assert(linkMsg.actions[3].type === "select");
            assert.deepEqual(linkMsg.actions[3].options, [
                { text: "1000-wedding", value: "1000-wedding" },
                { text: "brass-buttons", value: "brass-buttons" },
                { text: "sin-city-1", value: "sin-city-1" },
                { text: "sin-city-2", value: "sin-city-2" },
                { text: "sin-city-21", value: "sin-city-21" },
                { text: "streets-of-baltimore", value: "streets-of-baltimore" },
            ]);
            const menuCommand = (linkMsg.actions[3] as any).command;
            assert(menuCommand.name === "CreateChannel");
            assert(menuCommand.parameterName === "channel");
            assert(menuCommand.parameters.apiUrl === DefaultGitHubApiUrl);
            assert(menuCommand.parameters.channel === undefined);
            assert(menuCommand.parameters.owner === "grievous-angel");
            assert(menuCommand.parameters.repo === "sin-city");
            const hintFallBack = `or '/invite @atomist' me to a relevant channel and type
'@atomist repo owner=grievous-angel name=sin-city'`;
            assert(hintMsg.fallback === hintFallBack);
            assertStop(stopMsg);
        });

        it("should send a message with no selector if all channels already listed", () => {
            const repo = {
                name: "sin-city",
                owner: "grievous-angel",
                channels: [],
                org: {
                    team: {
                        chatTeams: [{
                            id: "TEAMID",
                            channels: [
                                { channelId: "C51NC1TY1", name: "sin-city-1" },
                                { channelId: "C51NC1TY2", name: "sin-city-2" },
                            ],
                        }],
                    },
                },
            };
            const chatId = {
                screenName: "gram",
                preferences: [{
                    name: "repo_mapping_flow",
                    value: JSON.stringify({}),
                }],
                chatTeam: {
                    id: "TEAMID",
                },
            };
            const repoLink = "<https://github.com/grievous-angel/sin-city|grievous-angel/sin-city>";
            const msg = mapRepoMessage(repo, chatId, DefaultBotName);
            assert(msg.attachments.length === 3);
            const linkMsg = msg.attachments[0];
            const hintMsg = msg.attachments[1];
            const stopMsg = msg.attachments[2];
            assert(linkMsg.pretext.includes(repoLink));
            assert(linkMsg.actions.length === 3);
            assert(linkMsg.actions[0].text === `Create #sin-city`);
            assert(linkMsg.actions[0].type === "button");
            const command = (linkMsg.actions[0] as any).command;
            assert(command.name === "CreateChannel");
            assert(command.parameters.apiUrl === DefaultGitHubApiUrl);
            assert(command.parameters.channel === "sin-city");
            assert(command.parameters.owner === "grievous-angel");
            assert(command.parameters.repo === "sin-city");
            assert(linkMsg.actions[1].text === "#sin-city-1");
            assert(linkMsg.actions[1].type === "button");
            const cmd1 = (linkMsg.actions[1] as any).command;
            assert(cmd1.name === "CreateChannel");
            assert(cmd1.parameters.apiUrl === DefaultGitHubApiUrl);
            assert(cmd1.parameters.channel === "sin-city-1");
            assert(cmd1.parameters.owner === "grievous-angel");
            assert(cmd1.parameters.repo === "sin-city");
            assert(linkMsg.actions[2].text === "#sin-city-2");
            assert(linkMsg.actions[2].type === "button");
            const cmd2 = (linkMsg.actions[2] as any).command;
            assert(cmd2.name === "CreateChannel");
            assert(cmd2.parameters.apiUrl === DefaultGitHubApiUrl);
            assert(cmd2.parameters.channel === "sin-city-2");
            assert(cmd2.parameters.owner === "grievous-angel");
            assert(cmd2.parameters.repo === "sin-city");
            const hintFallBack = `or '/invite @atomist' me to a relevant channel and type
'@atomist repo owner=grievous-angel name=sin-city'`;
            assert(hintMsg.fallback === hintFallBack);
            assertStop(stopMsg);
        });

    });

});
