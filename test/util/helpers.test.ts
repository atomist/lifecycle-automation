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

import { QueryOptions } from "@atomist/automation-client";
import "mocha";
import * as assert from "power-assert";

import {
    extractImageUrls,
    getGitHubUsers,
    getIssueMentions,
    isDmDisabled,
    linkGitHubUsers,
    linkIssues,
    removeMarkers,
    replaceChatIdWithGitHubId,
    repoSlackLink,
    truncateCommitMessage,
} from "../../lib/util/helpers";

describe("helpers", () => {

    describe("DMs", () => {

        it("test if DMs are enabled", () => {
            const chatId = {
                preferences: [{
                    name: "repo_mapping_flow",
                    value: "{\"disable_for_all\":true,\"disabled_repos\":[],\"disabled_for_unmapped_user\":false}",
                }, {
                    name: "dm",
                    value: "{\"disable_for_all\":false}",
                },
                ],
            };
            assert(isDmDisabled(chatId) === false);

        });

        it("test if DMs are disabled", () => {
            const chatId = {
                preferences: [{
                    name: "repo_mapping_flow",
                    value: "{\"disable_for_all\":true,\"disabled_repos\":[],\"disabled_for_unmapped_user\":false}",
                }, {
                    name: "dm",
                    value: "{\"disable_for_all\":true}",
                },
                ],
            };
            assert(isDmDisabled(chatId) === true);

        });

        it("test if DMs for builds are disabled", () => {
            const chatId = {
                preferences: [{
                    name: "repo_mapping_flow",
                    value: "{\"disable_for_all\":true,\"disabled_repos\":[],\"disabled_for_unmapped_user\":false}",
                }, {
                    name: "dm",
                    value: "{\"disable_for_all\":false, \"disable_for_build\":true}",
                },
                ],
            };
            assert(isDmDisabled(chatId, "build") === true);
        });

        it("test if DMs are disabled when overridden", () => {
            const chatId = {
                preferences: [{
                    name: "repo_mapping_flow",
                    value: "{\"disable_for_all\":true,\"disabled_repos\":[],\"disabled_for_unmapped_user\":false}",
                }, {
                    name: "dm",
                    value: "{\"disable_for_all\":true, \"disable_for_build\":false}",
                },
                ],
            };
            assert(isDmDisabled(chatId, "build") === true);

        });

    });

    describe("truncateCommitMessage", () => {

        const repo = {
            owner: "elvis",
            name: "costello",
            org: {
                owner: "elvis",
                provider: {
                    url: "https://github.com/",
                },
            },
        };

        it("should leave a short single line message unchanged", () => {
            const m = `Fixed something`;
            assert(truncateCommitMessage(m, repo) === m);
        });

        it("should retain only the first line of a multiline commit", () => {
            const e = `Fixed something`;
            const m = `${e}\n\nIt was cool.`;
            assert(truncateCommitMessage(m, repo) === e);
        });

        it("should truncate a long first line", () => {
            const m = `Fixed something but this first line is too long for a commit message`;
            const e = `Fixed something but this first line is too long fo...`;
            assert(truncateCommitMessage(m, repo) === e);
        });

        it("should truncate a long first line of multiline", () => {
            const m = `Fixed something but this first line is too long for a commit message

But wait, there's more!
`;
            const e = `Fixed something but this first line is too long fo...`;
            assert(truncateCommitMessage(m, repo) === e);
        });

        it("should escape reserved Slack characters", () => {
            const m = `Fixed something > 4 & < 7`;
            const e = `Fixed something &gt; 4 &amp; &lt; 7`;
            assert(truncateCommitMessage(m, repo) === e);
        });

        it("should escape reserved Slack characters making message longer than 50 chars", () => {
            const m = `Fixed something > 4 & < 7 even if message is long`;
            const e = `Fixed something &gt; 4 &amp; &lt; 7 even if message is long`;
            assert(truncateCommitMessage(m, repo) === e);
        });

        it("should link a simple issue in a commit message", () => {
            const m = `Fixed #6`;
            const e = `Fixed <https://github.com/elvis/costello/issues/6|#6>`;
            assert(truncateCommitMessage(m, repo) === e);
        });

        it("should link a repo issue in a commit message", () => {
            const m = `Fixed elvis/presley#1929`;
            const e = `Fixed <https://github.com/elvis/presley/issues/1929|elvis/presley#1929>`;
            assert(truncateCommitMessage(m, repo) === e);
        });

        it("should ignore an issue in commit message body", () => {
            const m = `Fixed stuff\n\nCloses #6 and elvis/presley#1929.\n`;
            const e = `Fixed stuff`;
            assert(truncateCommitMessage(m, repo) === e);
        });

        it("should link an issue that starts before the 50 char limit", () => {
            const m = `Changed some things so the issue identified by #1950`;
            const e = `Changed some things so the issue identified by ` +
                `<https://github.com/elvis/costello/issues/1950|#19...>`;
            assert(truncateCommitMessage(m, repo) === e);
        });

        it("should link a repo issue that starts before the 50 char limit", () => {
            const m = `Changed some things so the issue identified by elvis/presley#1929`;
            const e = `Changed some things so the issue identified by ` +
                `<https://github.com/elvis/presley/issues/1929|elv...>`;
            assert(truncateCommitMessage(m, repo) === e);
        });

        it("should not link an issue that starts after the 50 char limit", () => {
            const m = `Changed some things so the issue identified by the #1950`;
            const e = `Changed some things so the issue identified by the...`;
            assert(truncateCommitMessage(m, repo) === e);
        });

        it("should not link an issue that starts after the 50 char limit real", () => {
            const m = `Send tracking events with github auth is requested #705`;
            const e = `Send tracking events with github auth is requested...`;
            assert(truncateCommitMessage(m, repo) === e);
        });

        it("should not link a repo issue that starts after the 50 char limit", () => {
            const m = `Changed some things so the issue identified by the elvis/presley#1929`;
            const e = `Changed some things so the issue identified by the...`;
            assert(truncateCommitMessage(m, repo) === e);
        });

        it("should properly render a complicated commit title", () => {
            const m = `Changed <some things> so & issue identified by elvis/presley#1929

And we got some more down here #6.

Fixes #1950.
`;
            const e = `Changed &lt;some things&gt; so &amp; issue identified by ` +
                `<https://github.com/elvis/presley/issues/1929|elv...>`;
            assert(truncateCommitMessage(m, repo) === e);
        });

    });

    describe("extractImageUrls", () => {

        it("should find nothing", () => {
            const b = `Nothing to see here.`;
            const a = extractImageUrls(b);
            assert(a.length === 0);
        });

        it("should not find non-image URLs", () => {
            const b = `What the heck? Ignore https://www.stlouisblues.com/
and https://www.nhl.com/standings/index.html.`;
            const a = extractImageUrls(b);
            assert(a.length === 0);
        });

        it("should not find image with invalid protocol", () => {
            const b = `Nothing to see xhttp://static.atomist.com/rug/merge.jpeg`;
            const a = extractImageUrls(b);
            assert(a.length === 0);
        });

        it("should find the image when that is all", () => {
            const b = `http://static.atomist.com/rug/merge.jpeg`;
            const a = extractImageUrls(b);
            assert(a.length === 1);
            assert.deepStrictEqual(a[0], {
                text: "merge.jpeg",
                image_url: "http://static.atomist.com/rug/merge.jpeg",
                fallback: "merge.jpeg",
            });
        });

        it("should find the image in only Slack markup", () => {
            const b = `<http://static.atomist.com/rug/merge.jpeg>`;
            const a = extractImageUrls(b);
            assert(a.length === 1);
            assert.deepStrictEqual(a[0], {
                text: "merge.jpeg",
                image_url: "http://static.atomist.com/rug/merge.jpeg",
                fallback: "merge.jpeg",
            });
        });

        it("should find the image in named Slack markup", () => {
            const b = `<http://static.atomist.com/rug/merge.jpeg|merge>`;
            const a = extractImageUrls(b);
            assert(a.length === 1);
            assert.deepStrictEqual(a[0], {
                text: "merge.jpeg",
                image_url: "http://static.atomist.com/rug/merge.jpeg",
                fallback: "merge.jpeg",
            });
        });

        it("should find an image URL", () => {
            const b = `Look at this http://static.atomist.com/rug/merge.png.`;
            const a = extractImageUrls(b);
            assert(a.length === 1);
            assert.deepStrictEqual(a[0], {
                text: "merge.png",
                image_url: "http://static.atomist.com/rug/merge.png",
                fallback: "merge.png",
            });
        });

        it("should find an image in Slack markup", () => {
            const b = `Look at this <http://static.atomist.com/rug/merge.png>.`;
            const a = extractImageUrls(b);
            assert(a.length === 1);
            assert.deepStrictEqual(a[0], {
                text: "merge.png",
                image_url: "http://static.atomist.com/rug/merge.png",
                fallback: "merge.png",
            });
        });

        it("should find two image URLs", () => {
            const b = `Look at this http://static.atomist.com/rug/merge.png.  But
not this https://www.nhl.com/, this is cool https://image.blues.com/img/goal.jpg.
He shoots, he scores!`;
            const a = extractImageUrls(b);
            assert(a.length === 2);
            assert.deepStrictEqual(a[0], {
                text: "merge.png",
                image_url: "http://static.atomist.com/rug/merge.png",
                fallback: "merge.png",
            });
            assert.deepStrictEqual(a[1], {
                text: "goal.jpg",
                image_url: "https://image.blues.com/img/goal.jpg",
                fallback: "goal.jpg",
            });
        });

        it("should not find an image in a diabolical case", () => {
            // tslint:disable-next-line:max-line-length
            const b = "Here's the original message: https://atomist-community.slack.com/archives/C7GHDARGU/p1515798324000172\r\n\r\nHere's the issue that triggered that message: https://github.com/atomist/lifecycle-automation/issues/103\r\n\r\nHere's the URL causing the issue: https://api.slack.com/docs/messages/builder?msg=%7B%22attachments%22%3A%5B%7B%22mrkdwn_in%22%3A%5B%22text%22%2C%22pretext%22%5D%2C%22color%22%3A%22%2345B254%22%2C%22pretext%22%3A%22Open%20issues%3A%22%2C%22author_name%22%3A%22atomisthq%2Fbot-service%22%2C%22author_link%22%3A%22http%3A%2F%2Fatomist.com%22%2C%22author_icon%22%3A%22https%3A%2F%2Fimages.atomist.com%2Frug%2Fissue-open.png%22%2C%22text%22%3A%22%3Chttp%3A%2F%2Fatomist.com%7C%23826%3A%20Use%20the%20new%20channels%20and%20users%20end%20points%20in%20Neo%3E%5Cn%3Chttp%3A%2F%2Fatomist.com%7C%23824%3A%20Some%20other%20issue%3E%22%7D%2C%7B%22mrkdwn_in%22%3A%5B%22text%22%2C%22pretext%22%5D%2C%22pretext%22%3A%22Closed%20issues%3A%22%2C%22author_name%22%3A%22atomisthq%2Fbot-service%22%2C%22author_link%22%3A%22http%3A%2F%2Fatomist.com%22%2C%22author_icon%22%3A%22https%3A%2F%2Fimages.atomist.com%2Frug%2Fissue-closed.png%22%2C%22color%22%3A%22D94649%22%2C%22text%22%3A%22%3Chttp%3A%2F%2Fatomist.com%7C%23821%3A%20Big%20bug%3E%5Cn%3Chttp%3A%2F%2Fatomist.com%7C%23821%3A%20Some%20other%20bug%3E%5Cn%3Chttp%3A%2F%2Fatomist.com%7C%2381%3A%20Awesome%20feature%3E%22%7D%2C%7B%22mrkdwn_in%22%3A%5B%22text%22%2C%22pretext%22%5D%2C%22author_name%22%3A%22atomisthq%2Fbot-service%22%2C%22author_link%22%3A%22http%3A%2F%2Fatomist.com%22%2C%22author_icon%22%3A%22https%3A%2F%2Fimages.atomist.com%2Frug%2Fpull-request-merged.png%22%2C%22pretext%22%3A%22Reviewed%20PRs%3A%22%2C%22text%22%3A%22%3Chttp%3A%2F%2Fatomist.com%7C%23820%3A%20Add%20something%20useful%3E%20by%20%3C%40kipz%3E%22%7D%5D%7D\r\n";
            const a = extractImageUrls(b);
            assert(a.length === 0);
        });

        it("should deduplicate images", () => {
            const b = "http://static.atomist.com/rug/merge.png http://static.atomist.com/rug/merge.png";
            const a = extractImageUrls(b);
            assert(a.length === 1);
            assert.deepStrictEqual(a[0], {
                text: "merge.png",
                image_url: "http://static.atomist.com/rug/merge.png",
                fallback: "merge.png",
            });
        });

        it("should not backtrack indefinitely", () => {
            const b = "![https://media2.giphy.com/media/qilPKODIJZUgo/giphy.gif]" +
                "(https://media2.giphy.com/media/qilPKODIJZUgo/giphy.gif)";
            const a = extractImageUrls(b);
            assert(a.length === 1);
            assert.deepStrictEqual(a[0], {
                text: "giphy.gif",
                image_url: "https://media2.giphy.com/media/qilPKODIJZUgo/giphy.gif",
                fallback: "giphy.gif",
            });
        });

        it("should not backtrack indefinitely on invalid markdown", () => {
            const b = "![https://media2.giphy.com/media/qilPKODIJZUgo/giphy.gif" +
                "(https://media2.giphy.com/media/qilPKODIJZUgo/giphy.gif)";
            const a = extractImageUrls(b);
            assert(a.length === 1);
            assert.deepStrictEqual(a[0], {
                text: "giphy.gif",
                // tslint:disable-next-line:max-line-length
                image_url: "https://media2.giphy.com/media/qilPKODIJZUgo/giphy.gif(https://media2.giphy.com/media/qilPKODIJZUgo/giphy.gif",
                fallback: "giphy.gif",
            });
        });

    });

    describe("repoSlackLink", () => {

        it("should return a github.com link", () => {
            const r = {
                name: "music",
                owner: "palace",
                org: {},
            };
            const e = `<https://github.com/palace/music|palace/music>`;
            assert(repoSlackLink(r) === e);
        });

        it("should return a github provider link", () => {
            const r = {
                name: "music",
                owner: "palace",
                org: {
                    provider: {
                        url: "http://bonnie.prince.billy/github/",
                    },
                },
            };
            const e = `<http://bonnie.prince.billy/github/palace/music|palace/music>`;
            assert(repoSlackLink(r) === e);
        });

    });

    const issueChars = [" ", "	", ".", ",", "?", "|", "-", "/", ";", ":", "'",
        '"', "~", "!", "@", "#", "$", "%", "^", "&", "*", "(", "[", "{", ")", "]", "}"];
    const issueNotPrecedingChars = ["x", "6", "_"];
    const issueNotPostChars = ["x", "_"];
    const repoIssuePrecedingChars = [" ", "	", ":", "(", "[", "{"];
    const repoIssueNotPrecedingChars = ["_", ".", ",", "?", "|", "-", "/", ";", "'", '"', "~",
        "!", "@", "#", "$", "%", "^", "&", "*", ")", "]", "}"];

    describe("getIssueMentions", () => {

        it("should find a simple issue", () => {
            const m = `#123`;
            const i = getIssueMentions(m);
            assert(i.length === 1);
            assert(i[0] === m);
        });

        it("should find a repo issue", () => {
            const m = `elliott/smith#123`;
            const i = getIssueMentions(m);
            assert(i.length === 1);
            assert(i[0] === m);
        });

        it("should find a simple issue multiple times", () => {
            const m = `#123 #123 #123`;
            const i = getIssueMentions(m);
            assert(i.length === 1);
            assert(i[0] === "#123");
        });

        it("should find a repo issue multiple times", () => {
            const m = `elliott/smith#123 elliott/smith#123
xo elliott/smith#123
either/or elliott/smith#123`;
            const i = getIssueMentions(m);
            assert(i.length === 1);
            assert(i[0] === "elliott/smith#123");
        });

        it("should find multiple issues", () => {
            const issues = [
                "#123",
                "elliott/smith#321",
                "either/or#3",
                "roman/candle#1",
            ];
            const m = `${issues[0]} ${issues[1]}

${issues[0]} ${issues[2]} ${issues[2]}

${issues[3]}
`;
            const i = getIssueMentions(m);
            assert(i.length === issues.length);
            assert.deepEqual(i, issues);
        });

        it("should find simple issues preceded by acceptable characters", () => {
            const i = "#50";
            issueChars.forEach(c => {
                const ms = getIssueMentions(`${c}${i}`);
                assert(ms.length === 1, `failing character: '${c}'`);
                assert(ms[0] === i, `failing character: '${c}'`);
            });
        });

        it("should find simple issues followed by acceptable characters", () => {
            const i = "#50";
            issueChars.forEach(c => {
                const ms = getIssueMentions(`${i}${c}`);
                assert(ms.length === 1, `failing character: '${c}'`);
                assert(ms[0] === i, `failing character: '${c}'`);
            });
        });

        it("should ignore simple issues preceded by unacceptable characters", () => {
            const i = "#50";
            issueNotPrecedingChars.forEach(c => {
                const ms = getIssueMentions(`${c}${i}`);
                assert(ms.length === 0, `failing character: '${c}'`);
            });
        });

        it("should ignore simple issues followed by unacceptable characters", () => {
            const i = "#50";
            issueNotPostChars.forEach(c => {
                const ms = getIssueMentions(`${i}${c}`);
                assert(ms.length === 0, `failing character: '${c}'`);
            });
        });

        it("should find repo issues preceded by acceptable characters", () => {
            const i = "no/name#60";
            repoIssuePrecedingChars.forEach(c => {
                const ms = getIssueMentions(`${c}${i}`);
                assert(ms.length === 1, `failing character: '${c}'`);
                assert(ms[0] === i, `failing character: '${c}'`);
            });
        });

        it("should find repo issues followed by acceptable characters", () => {
            const i = "no/name#60";
            issueChars.forEach(c => {
                const ms = getIssueMentions(`${i}${c}`);
                assert(ms.length === 1, `failing character: '${c}'`);
                assert(ms[0] === i, `failing character: '${c}'`);
            });
        });

        it("should ignore repo issues preceded by unacceptable characters", () => {
            const i = "no/name#60";
            repoIssueNotPrecedingChars.forEach(c => {
                const ms = getIssueMentions(`${c}${i}`);
                assert(ms.length === 0, `failing character: '${c}'`);
            });
        });

        it("should ignore repo issues followed by unacceptable characters", () => {
            const i = "no/name#60";
            issueNotPostChars.forEach(c => {
                const ms = getIssueMentions(`${i}${c}`);
                assert(ms.length === 0, `failing character: '${c}'`);
            });
        });

        it("should ignore non-issues", () => {
            const m = `elliott#123   elliott
/smith#321  _non/issue#44
does/not/count#55  trailing/something#432b
`;
            const i = getIssueMentions(m);
            assert(i.length === 0);
        });

    });

    describe("linkIssues", () => {

        const r = {
            name: "smith",
            owner: "elliott",
            org: {
                owner: "elliott",
                provider: {
                    url: "https://github.com/",
                },
            },
        };

        const s = `elliott/smith`;
        const i = "123";
        const u = `https://github.com/${s}/issues/${i}`;
        const rs = `either/or`;
        const ri = "321";
        const ru = `https://github.com/${rs}/issues/${ri}`;

        it("should link a simple issue only", () => {
            const body = `#${i}`;
            const expected = `<${u}|#${i}>`;
            assert(linkIssues(body, r) === expected);
        });

        it("should link a repo issue only", () => {
            const body = `${rs}#${ri}`;
            const expected = `<${ru}|${rs}#${ri}>`;
            assert(linkIssues(body, r) === expected);
        });

        it("should link a simple issue", () => {
            const body = `The issue #${i} should match`;
            const expected = `The issue <${u}|#${i}> should match`;
            assert(linkIssues(body, r) === expected);
        });

        it("should link a repo issue", () => {
            const body = `The issue ${rs}#${ri} should match`;
            const expected = `The issue <${ru}|${rs}#${ri}> should match`;
            assert(linkIssues(body, r) === expected);
        });

        it("should link a simple issue at beginning of message", () => {
            const body = `#${i} should match`;
            const expected = `<${u}|#${i}> should match`;
            assert(linkIssues(body, r) === expected);
        });

        it("should link a repo issue at beginning of message", () => {
            const body = `${rs}#${ri} should match`;
            const expected = `<${ru}|${rs}#${ri}> should match`;
            assert(linkIssues(body, r) === expected);
        });

        it("should link a simple issue inside quotes", () => {
            const body = `The "#${i}" should match`;
            const expected = `The "<${u}|#${i}>" should match`;
            assert(linkIssues(body, r) === expected);
        });

        it("should link a simple issue more than once", () => {
            const body = `The #${i} should match and so should #${i}`;
            const expected = `The <${u}|#${i}> should match and so should <${u}|#${i}>`;
            assert(linkIssues(body, r) === expected);
        });

        it("should link a repo issue more than once", () => {
            const body = `The ${rs}#${ri} should match and so should ${rs}#${ri}`;
            const expected = `The <${ru}|${rs}#${ri}> should match and so should <${ru}|${rs}#${ri}>`;
            assert(linkIssues(body, r) === expected);
        });

        it("should link only valid simple issue references", () => {
            issueNotPrecedingChars.forEach(c => {
                const body = `The #${i} should match but ${c}#${i} should not`;
                const expected = `The <${u}|#${i}> should match but ${c}#${i} should not`;
                assert(linkIssues(body, r) === expected, `failing pre character: '${c}'`);
            });
            issueNotPostChars.forEach(c => {
                const body = `The #${i} should match but #${i}${c} should not`;
                const expected = `The <${u}|#${i}> should match but #${i}${c} should not`;
                assert(linkIssues(body, r) === expected, `failing post character: '${c}'`);
            });
        });

        it("should link only valid repo issue references", () => {
            repoIssueNotPrecedingChars.forEach(c => {
                const body = `The ${rs}#${ri} should match but ${c}${rs}#${ri} should not`;
                const expected = `The <${ru}|${rs}#${ri}> should match but ${c}${rs}#${ri} should not`;
                assert(linkIssues(body, r) === expected, `failing pre character: '${c}'`);
            });
            issueNotPostChars.forEach(c => {
                const body = `The ${rs}#${ri} should match but ${rs}#${ri}${c} should not`;
                const expected = `The <${ru}|${rs}#${ri}> should match but ${rs}#${ri}${c} should not`;
                assert(linkIssues(body, r) === expected, `failing post character: '${c}'`);
            });
        });

        it("should link a simple issue preceded by valid characters", () => {
            issueChars.forEach(c => {
                const body = `The #${i} should match but ${c}#${i} should not`;
                const expected = `The <${u}|#${i}> should match but ${c}<${u}|#${i}> should not`;
                assert(linkIssues(body, r) === expected, `failing character: '${c}'`);
            });
        });

        it("should link a repo issue preceded by valid character", () => {
            repoIssuePrecedingChars.forEach(c => {
                const body = `The ${rs}#${ri} should match and so should ${c}${rs}#${ri}`;
                const expected = `The <${ru}|${rs}#${ri}> should match and so should ${c}<${ru}|${rs}#${ri}>`;
                assert(linkIssues(body, r) === expected, `failing character: '${c}'`);
            });
        });

        it("should link a simple issue followed by valid characters", () => {
            issueChars.forEach(c => {
                const body = `The #${i} should match but #${i}${c} should not`;
                const expected = `The <${u}|#${i}> should match but <${u}|#${i}>${c} should not`;
                assert(linkIssues(body, r) === expected, `failing character: '${c}'`);
            });
        });

        it("should link a repo issue followed by valid character", () => {
            issueChars.forEach(c => {
                const body = `The ${rs}#${ri} should match and so should ${rs}#${ri}${c}`;
                const expected = `The <${ru}|${rs}#${ri}> should match and so should <${ru}|${rs}#${ri}>${c}`;
                assert(linkIssues(body, r) === expected, `failing character: '${c}'`);
            });
        });

        it("should not link foo#123", () => {
            const body = `some foo#123 should not match`;
            const expected = body;
            assert(linkIssues(body, r) === expected);
        });

        it("should not link inside a link", () => {
            const body = `some [${rs} #${ri}](${ru}) should not match`;
            const expected = body;
            assert(linkIssues(body, r) === expected);
        });

        it("should not link inside a named link", () => {
            const body = `some [${rs} #${ri}][#${ri}] should not match

[#${ri}]: ${ru}
`;
            const expected = body;
            assert(linkIssues(body, r) === expected);
        });

        it("should not link inside a simple Slack link", () => {
            const body = `some <http://www.sweetadeline.net/no/name/#4> should not match`;
            const expected = body;
            assert(linkIssues(body, r) === expected);
        });

        it("should not link inside a named Slack link", () => {
            const body = `some <${ru}|${rs} #${ri}> should not match`;
            const expected = body;
            assert(linkIssues(body, r) === expected);
        });

        it("should not link inside a code block", () => {
            const body = `on shall not link an issue

\`\`\`
inside a
  code #1763
block
\`\`\`

outside is OK
`;
            const expected = body;
            assert(linkIssues(body, r) === expected);
        });

        it("should not link inside a hinted code block", () => {
            const body = `on shall not link an issue

\`\`\`typescript
function xo(waltz: number = 2): string {
    return "3. Waltz #2 (XO)";
}
\`\`\`

outside is OK
`;
            const expected = body;
            assert(linkIssues(body, r) === expected);
        });

        it("should link inside a non-code block", () => {
            const body = "this is ```not #" + i + " a code``` block";
            const expected = "this is ```not <" + u + "|#" + i + "> a code``` block";
            assert(linkIssues(body, r) === expected);
        });

        it("should appropriately link a complex body", () => {
            const body = `some links #${i} should be made.

Some [${rs} #${ri}](${ru}) should not.  Others ${rs}#${ri} should
even if they are in another repository.  But not if
[${rs} #${ri}][#${ri}] is already linked.

But still, don't link this#42 which is close but not quite.

[#${ri}]: ${ru} (Title of this link)

\`\`\`ruby
no
  #1763
  links
  in
here
\`\`\`

this \`\`\`#${i}\`\`\` should match

Also, nothing to <http://www.sweetadeline.net/|elliott/smith#34> here.
`;
            const expected = `some links <${u}|#${i}> should be made.

Some [${rs} #${ri}](${ru}) should not.  Others <${ru}|${rs}#${ri}> should
even if they are in another repository.  But not if
[${rs} #${ri}][#${ri}] is already linked.

But still, don't link this#42 which is close but not quite.

[#${ri}]: ${ru} (Title of this link)

\`\`\`ruby
no
  #1763
  links
  in
here
\`\`\`

this \`\`\`<${u}|#${i}>\`\`\` should match

Also, nothing to <http://www.sweetadeline.net/|elliott/smith#34> here.
`;
            assert(linkIssues(body, r) === expected);
        });

    });

    describe("getGitHubUsers", () => {

        it("should find a user mention", () => {
            const user = "jason-isbell";
            const msg = `@${user}`;
            const mentions = getGitHubUsers(msg);
            assert(mentions.length === 1);
            assert(mentions[0] === user);
        });

        it("should find a user mention in text", () => {
            const user = "jason-isbell";
            const msg = `Is @${user} here?`;
            const mentions = getGitHubUsers(msg);
            assert(mentions.length === 1);
            assert(mentions[0] === user);
        });

        it("should find multiple user mentions", () => {
            const users = [
                "jason-isbell",
                "AmandaShires",
                "jimboHart",
                "Derry-de-Borja",
            ];
            const msg = `Is @${users[0]} here? I know @${users[1]}
and @${users[2]} are ready.  Has anyone seen @${users[3]}?`;
            const mentions = getGitHubUsers(msg);
            assert(mentions.length === users.length);
            for (let i = 0; i < users.length; i++) {
                assert(mentions[i] === users[i]);
            }
        });

        it("should find multiple user mentions surrounded by legal characters", () => {
            const users = [
                "jason-isbell",
                "AmandaShires",
                "jimboHart",
                "Derry-de-Borja",
            ];
            const msg = `Is *@${users[0]}* here? I know @${users[1]}(!)
&@${users[2]}% are ready.  I have not seen $@${users[3]}.`;
            const mentions = getGitHubUsers(msg);
            assert(mentions.length === users.length);
            for (let i = 0; i < users.length; i++) {
                assert(mentions[i] === users[i]);
            }
        });

        it("should find multiple mentions of same user", () => {
            const user = "jason-isbell";
            const msg = `Is @${user} here?  Has anyone see @${user}?  I know
he was here a bit ago.  Who?  @${user} of course!  Well, if you see
@${user}, let me know.
`;
            const mentions = getGitHubUsers(msg);
            assert(mentions.length === 1);
            assert(mentions[0] === user);
        });

        it("should find multiple mentions of multiple users", () => {
            const users = [
                "jason-isbell",
                "AmandaShires",
                "jimboHart",
                "Derry-de-Borja",
            ];
            const msg = `Is @${users[0]} here? I know @${users[1]}
and @${users[2]} are ready, but I'm not sure about @${users[0]}.  While, you're
at it, can you ask @${users[1]} about @${users[3]}?  Thanks @${users[1]}!`;
            const mentions = getGitHubUsers(msg);
            assert(mentions.length === users.length);
            for (let i = 0; i < users.length; i++) {
                assert(mentions[i] === users[i]);
            }
        });

        it("should ignore a too long user name that is otherwise valid", () => {
            const msg = "@jason-isbell-and-the-four-hundred-unit-are-coming-to-your-town";
            const mentions = getGitHubUsers(msg);
            assert(mentions.length === 0);
        });

        it("should not think an email address is a mention", () => {
            const msg = "jason@isbell.com";
            const mentions = getGitHubUsers(msg);
            assert(mentions.length === 0);
        });

        it("should not think an email address is a mention in text", () => {
            const msg = `This is an email address jason@isbell.com,
not a user mention.
`;
            const mentions = getGitHubUsers(msg);
            assert(mentions.length === 0);
        });

        it("should ignore mentions of invalid user names", () => {
            const msg = `This is @not_valid nor is this @invalid-user- also this is
an @-invalid-user name nor can you have @double--hyphens in a user name
`;
            const mentions = getGitHubUsers(msg);
            assert(mentions.length === 0);
        });

        it("should ignore mentions invalidated by surrounding text", () => {
            const msg = `GitHub does not like mentioned preceded by _@underscore nor
does it like something that looks like an @email.domain or a partial@email
`;
            const mentions = getGitHubUsers(msg);
            assert(mentions.length === 0);
        });

        it("should handle mentions and non-mentions properly", () => {
            const users = [
                "jason-isbell",
                "AmandaShires",
                "jimboHart",
                "Derry-de-Borja",
            ];
            const msg = `This is @not_valid nor is this @invalid-user- but @${users[0]} is.
The @-invalid-user should not get picked up but @${users[1]} and @${users[2]} are.  Having
@double--hyphens in a user name makes it invalid, but again @${users[0]} and additionally
@${users[3]} are valid.  GitHub does not like mentioned preceded by _@underscore nor
does it like something that looks like an @email.domain or a partial@email
`;
            const mentions = getGitHubUsers(msg);
            assert(mentions.length === users.length);
            for (let i = 0; i < users.length; i++) {
                assert(mentions[i] === users[i]);
            }
        });

    });

    describe("linkGitHubUsers", () => {

        const gitHubLogin = "jason-isbell";
        const slackId = "T3434343_U1DBT400U";
        const screenName = "jason";
        const ctx: any = {
            teamId: "T3434343",
            graphClient: {
                query(options: QueryOptions<any>): Promise<any> {
                    const ghid = (options.variables.gitHubIds[0] === gitHubLogin) ? {
                        GitHubId: [{
                            login: gitHubLogin,
                            person: {
                                chatId: {
                                    id: slackId,
                                    screenName,
                                    preferences: {},
                                },
                            },
                        }],
                    } : {};
                    return Promise.resolve(ghid);
                },
            },
        };

        it("should link a known user", done => {
            const body = `@${gitHubLogin}`;
            const expected = `<@${screenName}>`;
            linkGitHubUsers(body, ctx)
                .then(r => {
                    assert(r === expected);
                })
                .then(done, done);
        });

        it("should not link an unknown user", done => {
            const body = `@amanda-shires`;
            linkGitHubUsers(body, ctx)
                .then(r => {
                    assert(r === body);
                })
                .then(done, done);
        });

        it("should link a known user in text", done => {
            const body = `Have you heard of @${gitHubLogin} and the 400 Unit?`;
            const expected = `Have you heard of <@${screenName}> and the 400 Unit?`;
            linkGitHubUsers(body, ctx)
                .then(r => {
                    assert(r === expected);
                })
                .then(done, done);
        });

        it("should link a known user multiple times", done => {
            const body = `Have you heard of @${gitHubLogin} and the 400 Unit?
He, @${gitHubLogin} that is, is not a bad slide guitarist.
`;
            const expected = `Have you heard of <@${screenName}> and the 400 Unit?
He, <@${screenName}> that is, is not a bad slide guitarist.
`;
            linkGitHubUsers(body, ctx)
                .then(r => {
                    assert(r === expected);
                })
                .then(done, done);
        });

    });

    describe("replaceChatIdWithGitHubId", () => {

        const gitHubLogin = "jason-isbell";
        const slackId = "U1DBT400U";
        const slackIdUnknownGitHub = "U1DBT400F";
        const screenName = "jason";
        const ctx: any = {
            teamId: "T3434343",
            graphClient: {
                query(options: QueryOptions<any>): Promise<any> {
                    if (options.variables.chatId === slackId) {
                        return Promise.resolve({
                            ChatTeam: [{
                                members: [{
                                    screenName,
                                    preferences: [],
                                    person: {
                                        gitHubId: {
                                            login: gitHubLogin,
                                        },
                                    },
                                }],
                            }],
                        });
                    } else if (options.variables.chatId === slackIdUnknownGitHub) {
                        return Promise.resolve({
                            ChatTeam: [{
                                members: [{
                                    screenName,
                                    preferences: [],
                                }],
                            }],
                        });
                    }
                    return Promise.resolve({});
                },
            },
        };

        it("should replace known user with github login", done => {
            const body = `<@${slackId}>`;
            const expected = `@${gitHubLogin}`;
            replaceChatIdWithGitHubId(body, ctx.teamId, ctx)
                .then(r => {
                    assert(r === expected);
                })
                .then(done, done);
        });

        it("should replace known user with slack screeName", done => {
            const body = `<@${slackIdUnknownGitHub}>`;
            const expected = screenName;
            replaceChatIdWithGitHubId(body, ctx.teamId, ctx)
                .then(r => {
                    assert(r === expected);
                })
                .then(done, done);
        });

        it("should not replace unknown user", done => {
            const body = `<@U123456>`;
            replaceChatIdWithGitHubId(body, ctx.teamId, ctx)
                .then(r => {
                    assert(r === body);
                })
                .then(done, done);
        });

    });

    describe("removeMarkers", () => {

        it("should remove one marker", () => {
            const body = `This is some test text
[atomist:generated]
in line with some other text`;
            assert.equal(removeMarkers(body), `This is some test text

in line with some other text`);
        });

        it("should remove two markers", () => {
            const body = `This is some test text
[atomist:generated][atomist:add-pcf-manifest]
in line with some other text`;
            assert.equal(removeMarkers(body), `This is some test text

in line with some other text`);
        });

        it("should remove two markers in different rows", () => {
            const body = `This is some test text
[atomist:generated]
in line with some other text
[atomist:generated]`;
            assert.equal(removeMarkers(body), `This is some test text

in line with some other text
`);
        });

    });

    /*
    describe("prAssigneeNotification", () => {
        it("should not DM assignee if they assigned themselves", () => {
            const plan = new EventPlan();
            const pr = new cortex.PullRequest().withLastAssignedBy(new cortex.GitHubId().withLogin("kipz"));
            const pe = {
                scalar: (node: any, ex: any) => {
                    return {
                        person: {
                            chatId: {
                                screenName: "kipper",
                            },
                        },
                    };
                },
            };
            prAssigneeNotification(null, null, "", "kipz", pr, pe as PathExpressionEngine,
                null, null, null, null, plan);
            assert(plan.messages.length === 0);
            assert(plan.instructions.length === 0);
        });

        it("should DM assignee if they did not assigne themselves", () => {
            const plan = new EventPlan();
            const pr = new cortex.PullRequest()
                .withLastAssignedBy(new cortex.GitHubId().withLogin("david"))
                .withAuthor(new cortex.GitHubId().withLogin("ben"))
                .withState("open")
                .withNumber(1)
                .withTitle("blah");

            const pe = {
                scalar: (node: any, ex: any) => {
                    return {
                        person: {
                            chatId: {
                                screenName: "kipper",
                            },
                        },
                    };
                },
            };

            const repo = {

            };
            prAssigneeNotification(null, null, "", "kipz", pr, pe as PathExpressionEngine,
                null, repo as cortex.Repo, null, null, plan);
            assert(plan.messages.length !== 0);
        });
    });

    describe("issueAssigneeNotification", () => {
        it("should not DM assignee if they assigned themselves", () => {
            const plan = new EventPlan();
            const issue = new cortex.Issue().withLastAssignedBy(new cortex.GitHubId().withLogin("kipz"));
            const pe = {
                scalar: (node: any, ex: any) => {
                    return {
                        person: {
                            chatId: {
                                screenName: "kipper",
                            },
                        },
                    };
                },
            };
            issueAssigneeNotification(null, null, "", "kipz", issue, pe as PathExpressionEngine,
                null, null, null, null, plan);
            assert(plan.messages.length === 0);
            assert(plan.instructions.length === 0);
        });

        it("should DM assignee if they did not assigne themselves", () => {
            const plan = new EventPlan();
            const issue = new cortex.Issue()
                .withLastAssignedBy(new cortex.GitHubId().withLogin("ben"))
                .withOpenedBy(new cortex.GitHubId().withLogin("david"))
                .withState("open")
                .withNumber(1)
                .withTitle("title");

            const pe = {
                scalar: (node: any, ex: any) => {
                    return {
                        person: {
                            chatId: {
                                screenName: "kipper",
                            },
                        },
                    };
                },
            };

            const repo = {

            };
            issueAssigneeNotification("", "", "", "kipz", issue, pe as PathExpressionEngine,
                null, repo as cortex.Repo, "null", "null", plan);
            assert(plan.messages.length !== 0);
        });
    });
    */

});
