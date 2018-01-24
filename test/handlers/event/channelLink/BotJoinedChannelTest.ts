import "mocha";
import * as assert from "power-assert";

import * as slack from "@atomist/slack-messages/SlackMessages";
import axios from "axios";

import { Destination, MessageOptions } from "@atomist/automation-client/spi/message/MessageClient";
import {
    BotJoinedChannel,
    fuzzyChannelRepoMatch,
    RepoApi,
    repoOptions,
} from "../../../../src/handlers/event/channellink/BotJoinedChannel";
import * as graphql from "../../../../src/typings/types";

describe("BotJoinedChannel", () => {

    describe("fuzzyChannelRepoMatch", () => {

        it("should find nothing", () => {
            const channel = "gram-parsons";
            const repos: graphql.BotJoinedChannel.Repo[] = [
                { name: "international_submarine_band" },
                { name: "the-byrds" },
                { name: "chris-hillman" },
                { name: "flying-burrito-brothers" },
                { name: "emmylou-harris" },
            ];
            assert(fuzzyChannelRepoMatch(channel, repos).length === 0);
        });

        it("should find a shorter match", () => {
            const channel = "gram-parsons";
            const repos: graphql.BotJoinedChannel.Repo[] = [
                { name: "emmylou-harris" },
                { name: "gram" },
                { name: "chris-hillman" },
            ];
            const matches = fuzzyChannelRepoMatch(channel, repos);
            assert(matches.length === 1);
            assert(matches[0].name === "gram");
        });

        it("should find a longer match", () => {
            const channel = "gram-parsons";
            const repos: graphql.BotJoinedChannel.Repo[] = [
                { name: "emmylou-harris" },
                { name: "gram-parsons-and-the-fallen-angels" },
                { name: "chris-hillman" },
            ];
            const matches = fuzzyChannelRepoMatch(channel, repos);
            assert(matches.length === 1);
            assert(matches[0].name === "gram-parsons-and-the-fallen-angels");
        });

        it("should find all matches", () => {
            const channel = "gram-parsons";
            const repos: graphql.BotJoinedChannel.Repo[] = [
                { name: "emmylou-harris" },
                { name: "gram-parsons-and-the-fallen-angels" },
                { name: "chris-hillman" },
                { name: "am-par" },
            ];
            const matches = fuzzyChannelRepoMatch(channel, repos);
            assert(matches.length === 2);
            assert(matches[0].name === "am-par");
            assert(matches[1].name === "gram-parsons-and-the-fallen-angels");
        });

        it("should find only two matches", () => {
            const channel = "gram-parsons";
            const repos: graphql.BotJoinedChannel.Repo[] = [
                { name: "parsons" },
                { name: "emmylou-harris" },
                { name: "gram-parsons-and-the-fallen-angels" },
                { name: "chris-hillman" },
                { name: "gram" },
                { name: "am" },
            ];
            const matches = fuzzyChannelRepoMatch(channel, repos);
            assert(matches.length === 2);
            assert(matches[0].name === "parsons");
            assert(matches[1].name === "gram");
        });

        it("should find the best two matches", () => {
            const channel = "gram-parsons";
            const repos: graphql.BotJoinedChannel.Repo[] = [
                { name: "parsons" },
                { name: "emmylou-harris" },
                { name: "gram-parsons-and-the-fallen-angels" },
                { name: "gram-parson" },
                { name: "chris-hillman" },
                { name: "gram" },
                { name: "gram-parsonsx" },
                { name: "gram-par" },
            ];
            const matches = fuzzyChannelRepoMatch(channel, repos);
            assert(matches.length === 2);
            assert(matches[0].name === "gram-parson");
            assert(matches[1].name === "gram-parsonsx");
        });

        it("should find the best two matches when some repos names are null", () => {
            const channel = "gram-parsons";
            const repos: graphql.BotJoinedChannel.Repo[] = [
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
            const matches = fuzzyChannelRepoMatch(channel, repos);
            assert(matches.length === 2);
            assert(matches[0].name === "gram-parson");
            assert(matches[1].name === "gram-parsonsx");
        });

    });

    describe("repoOptions", () => {

        const lolRepos: RepoApi[][] = [
            [
                {
                    name: "7-mary-3",
                    owner: "jon",
                    api: undefined,
                },
                {
                    name: "79-charles",
                    owner: "jon",
                    api: undefined,
                },
            ],
            [
                {
                    name: "7-mary-4",
                    owner: "ponch",
                    api: "https://ghe.chp.gov/v3/",
                },
                {
                    name: "79-mary-4",
                    owner: "ponch",
                    api: "https://ghe.chp.gov/v3/",
                },
            ],
        ];

        it("should create an option group", () => {
            const e = [
                {
                    text: "jon/",
                    options: [
                        {
                            text: "7-mary-3",
                            value: "jon/7-mary-3|",
                        },
                        {
                            text: "79-charles",
                            value: "jon/79-charles|",
                        },
                    ],
                },
                {
                    text: "ponch/",
                    options: [
                        {
                            text: "7-mary-4",
                            value: "ponch/7-mary-4|https://ghe.chp.gov/v3/",
                        },
                        {
                            text: "79-mary-4",
                            value: "ponch/79-mary-4|https://ghe.chp.gov/v3/",
                        },
                    ],
                },
            ];
            assert.deepEqual(repoOptions(lolRepos), e);
        });

    });

    describe("handle", () => {

        it("should not send a message if bot invited itself", done => {

            const event = {
                data: {
                    UserJoinedChannel: [{
                        user: {
                            isAtomistBot: "true",
                            screenName: "atomist_bot",
                            userId: "U1234567",
                        },
                        channel: {
                            botInvitedSelf: true,
                            channelId: "CHP87654P",
                            name: "ponch",
                            repos: [],
                            team: {
                                id: "T1L0VDKJP",
                                orgs: [
                                    {
                                        owner: "n",
                                        provider: {
                                            apiUrl: "https://ghe.chp.gov/v3/",
                                        },
                                        repo: [
                                            {
                                                name: "n",
                                                owner: "n",
                                            },
                                        ],
                                    },
                                ],
                            },
                        },
                    }],
                },
                extensions: {
                    type: "READ_ONLY",
                    operationName: "BotJoinedChannel",
                },
            };

            let silent = true;
            const ctx: any = {
                messageClient: {
                    send(
                        msg: any,
                        destinations: Destination[],
                        options?: MessageOptions,
                    ): Promise<any> {
                        silent = false;
                        return Promise.resolve(true);
                    },
                },
            };
            const h = new BotJoinedChannel();
            h.handle(event, ctx)
                .then(() => {
                    assert(silent);
                })
                .then(() => done(), done);
        });

        it("should send a mapped repo message", done => {

            const event = {
                data: {
                    UserJoinedChannel: [{
                        user: {
                            isAtomistBot: "true",
                            screenName: "atomist_bot",
                            userId: "U1234567",
                        },
                        channel: {
                            botInvitedSelf: false,
                            channelId: "CHP87654P",
                            name: "ponch",
                            repos: [
                                {
                                    name: "n",
                                    owner: "n",
                                    org: {
                                        provider: {
                                            url: "https://ghe.chp.gov/",
                                        },
                                    },
                                },
                            ],
                            team: {
                                id: "T1L0VDKJP",
                                orgs: [
                                    {
                                        owner: "n",
                                        provider: {
                                            apiUrl: "https://ghe.chp.gov/v3/",
                                        },
                                        repo: [
                                            {
                                                name: "n",
                                                owner: "n",
                                            },
                                        ],
                                    },
                                ],
                            },
                        },
                    }],
                },
                extensions: {
                    type: "READ_ONLY",
                    operationName: "BotJoinedChannel",
                },
            };

            let sent = false;
            const ctx: any = {
                messageClient: {
                    send(
                        msg: any,
                        destinations: Destination[],
                        options?: MessageOptions,
                    ): Promise<any> {
                        const m = msg as string;
                        assert(m.includes("Hello! Now I can respond to messages beginning with @atomist_bot."));
                        assert(m.includes("I will post GitHub notifications about <https://ghe.chp.gov/n/n|n/n>"));
                        sent = true;
                        return Promise.resolve(true);
                    },
                },
            };
            const h = new BotJoinedChannel();
            h.handle(event, ctx)
                .then(() => {
                    assert(sent);
                })
                .then(() => done(), done);
        });

        it("should send a GitHub integration suggestion", done => {

            const event = {
                data: {
                    UserJoinedChannel: [{
                        user: {
                            isAtomistBot: "true",
                            screenName: "atomist_bot",
                            userId: "U1234567",
                        },
                        channel: {
                            botInvitedSelf: false,
                            channelId: "CHP87654P",
                            name: "ponch",
                            repos: [],
                            team: {
                                id: "T1L0VDKJP",
                                orgs: [],
                            },
                        },
                    }],
                },
                extensions: {
                    type: "READ_ONLY",
                    operationName: "BotJoinedChannel",
                },
            };

            let sent = false;
            const ctx: any = {
                messageClient: {
                    send(
                        msg: any,
                        destinations: Destination[],
                        options?: MessageOptions,
                    ): Promise<any> {
                        const m = msg as string;
                        assert(m.includes("Hello! Now I can respond to messages beginning with @atomist_bot."));
                        assert(m.includes("I won't be able to do much without GitHub integration, though."));
                        assert(m.includes("Run `@atomist_bot enroll org` to set that up."));
                        sent = true;
                        return Promise.resolve(true);
                    },
                },
            };
            const h = new BotJoinedChannel();
            h.handle(event, ctx)
                .then(() => {
                    assert(sent);
                })
                .then(() => done(), done);
        });

    });

});
