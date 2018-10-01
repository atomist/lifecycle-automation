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

import * as namespace from "@atomist/automation-client/internal/util/cls";
import { wrapLinksInText } from "../../lib/util/tracking";

const event = "RemEvent";
const workspaceId = "TREM1980";
const messageId = "lifes-rich-pageant";
const operation = "BeginTheBegin";

describe("tracking", () => {

    function setup() {
        namespace.init();
        namespace.set({
            correlationId: "xxx",
            workspaceId,
            workspaceName: "TestTeam",
            operation,
            name: "test",
            version: "0.1.0",
            invocationId: messageId,
            ts: new Date().getTime(),
        });
    }

    describe("wrapLinksInText", () => {

        it("should wrap an named link", () => {
            const ses = namespace.init();
            ses.run(() => {
                setup();
                const u = `http://www.rem.com/`;
                const t = `<${u}|R.E.M.>`;
                const hashes: Array<[string, string]> = [];
                const r = wrapLinksInText(t, event, hashes);
                const e = `<${urlToMixPanel(hashes[0][0])}|R.E.M.>`;
                assert(r === e);
            });
        });

        it("should wrap an unnamed link", () => {
            const ses = namespace.init();
            ses.run(() => {
                setup();
                const u = `http://www.rem.com/`;
                const t = `<${u}>`;
                const hashes: Array<[string, string]> = [];
                const r = wrapLinksInText(t, event, hashes);
                const e = `<${urlToMixPanel(hashes[0][0])}|${u}>`;
                assert(r === e);
            });
        });

        it("should wrap an named link with URI escapes", () => {
            const ses = namespace.init();
            ses.run(() => {
                setup();
                const u = `http://www.rem.com/reckoning/01-%2BDon%31t%20Go%20Back%20to%2C%20Rockvillle.html`;
                const t = `<${u}|(Don't Go Back to) Rockville>`;
                const hashes: Array<[string, string]> = [];
                const r = wrapLinksInText(t, event, hashes);
                const e = `<${urlToMixPanel(hashes[0][0])}|(Don't Go Back to) Rockville>`;
                assert(r === e);
            });
        });

        it("should wrap an unnamed link with URI escapes", () => {
            const ses = namespace.init();
            ses.run(() => {
                setup();
                const u = `http://www.rem.com/reckoning/01-%2BDon%31t%20Go%20Back%20to%2C%20Rockvillle.html`;
                const t = `<${u}>`;
                const hashes: Array<[string, string]> = [];
                const r = wrapLinksInText(t, event, hashes);
                const e = `<${urlToMixPanel(hashes[0][0])}|${u}>`;
                assert(r === e);
            });
        });

        it("should ignore a bare link", () => {
            const ses = namespace.init();
            ses.run(() => {
                setup();
                const t = `http://www.rem.com/`;
                const r = wrapLinksInText(t, event, []);
                assert(r === t);
            });
        });

        it("should ignore a non link", () => {
            const ses = namespace.init();
            ses.run(() => {
                setup();
                const t = `Less < than || greater > than`;
                const r = wrapLinksInText(t, event, []);
                assert(r === t);
            });
        });

        it("should wrap a named link in text", () => {
            const ses = namespace.init();
            ses.run(() => {
                setup();
                const u = `http://www.rem.com/`;
                const t = `"There stands <${u}|R.E.M.>"`;
                const hashes: Array<[string, string]> = [];
                const r = wrapLinksInText(t, event, hashes);
                const e = `"There stands <${urlToMixPanel(hashes[0][0])}|R.E.M.>"`;
                assert(r === e);
            });
        });

        it("should wrap an unnamed link in text", () => {
            const ses = namespace.init();
            ses.run(() => {
                setup();
                const u = `http://www.rem.com/`;
                const t = `"There stands <${u}>."`;
                const hashes: Array<[string, string]> = [];
                const r = wrapLinksInText(t, event, hashes);
                const e = `"There stands <${urlToMixPanel(hashes[0][0])}|${u}>."`;
                assert(r === e);
            });
        });

        it("should wrap a named link multiple times", () => {
            const ses = namespace.init();
            ses.run(() => {
                setup();
                const u = `http://www.rem.com/`;
                const t = `"There stands <${u}|R.E.M.> and <${u}|R.E.M.>"`;
                const hashes: Array<[string, string]> = [];
                const r = wrapLinksInText(t, event, hashes);
                const e = `"There stands <${urlToMixPanel(hashes[0][0])}|R.E.M.> and <${
                    urlToMixPanel(hashes[1][0])}|R.E.M.>"`;
                assert(r === e);
            });
        });

        it("should wrap an unnamed link in text multiple times", () => {
            const ses = namespace.init();
            ses.run(() => {
                setup();
                const u = `http://www.rem.com/`;
                const t = `"There stands <${u}> and <${u}>."`;
                const hashes: Array<[string, string]> = [];
                const r = wrapLinksInText(t, event, hashes);
                const e = `"There stands <${urlToMixPanel(hashes[0][0])}|${u}> and <${
                    urlToMixPanel(hashes[1][0])}|${u}>."`;
                assert(r === e);
            });
        });

        it("should wrap multiple named links", () => {
            const ses = namespace.init();
            ses.run(() => {
                setup();
                const u = `http://www.rem.com`;
                const u1 = `https://www.rem.com/murmur/`;
                const u2 = `https://www.rem.com/murmur/04-talk-about-the-passion.html`;
                const u3 = `http://www.rem.com/reckoning/01-%2Bdon%2At-go-back-to%2C-rockville.html`;
                const u4 = `http://www.rem.com/reckoning/`;
                const t = `"There stands <${u}|R.E.M.>" who released the
album _<${u1}|Murmur>_ in <1983>, with tracks like <${u2}|Talk About the Passion>.
You might think <${u3}|(Don't Go Back To) Rockville> was on Murmur, but it
wasn't.  It was on _<${u4}|Reckoning>_ by <${u}|R.E.M.>.
`;
                const hashes: Array<[string, string]> = [];
                const r = wrapLinksInText(t, event, hashes);
                const e = `"There stands <${urlToMixPanel(hashes[0][0])}|R.E.M.>" who released the
album _<${urlToMixPanel(hashes[1][0])}|Murmur>_ in <1983>, with tracks like <${
                    urlToMixPanel(hashes[2][0])}|Talk About the Passion>.
You might think <${urlToMixPanel(hashes[3][0])}|(Don't Go Back To) Rockville> was on Murmur, but it
wasn't.  It was on _<${urlToMixPanel(hashes[4][0])}|Reckoning>_ by <${urlToMixPanel(hashes[5][0])}|R.E.M.>.
`;
                assert(r === e);
            });
        });

        it("should wrap multiple unnamed links", () => {
            const ses = namespace.init();
            ses.run(() => {
                setup();
                const u = `http://www.rem.com`;
                const u1 = `https://www.rem.com/murmur/`;
                const u2 = `https://www.rem.com/murmur/04-talk-about-the-passion.html`;
                const u3 = `http://www.rem.com/reckoning/01-%2Bdon%2At-go-back-to%2C-rockville.html`;
                const u4 = `http://www.rem.com/reckoning/`;
                const t = `"There stands <${u}>" who released the
album _<${u1}>_ in <1983>, with tracks like <${u2}>.
You might think <${u3}> was on Murmur, but it
wasn't.  It was on _<${u4}>_ by <${u}>.
`;
                const hashes: Array<[string, string]> = [];
                const r = wrapLinksInText(t, event, hashes);
                const e = `"There stands <${urlToMixPanel(hashes[0][0])}|${u}>" who released the
album _<${urlToMixPanel(hashes[1][0])}|${u1}>_ in <1983>, with tracks like <${urlToMixPanel(hashes[2][0])}|${u2}>.
You might think <${urlToMixPanel(hashes[3][0])}|${u3}> was on Murmur, but it
wasn't.  It was on _<${urlToMixPanel(hashes[4][0])}|${u4}>_ by <${urlToMixPanel(hashes[5][0])}|${u}>.
`;
                assert(r === e);
            });
        });

    });

});

function urlToMixPanel(url: string): string {
    return `https://r.atomist.com/${url}`;
}
