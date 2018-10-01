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

import {
    isChannel,
    isSlack,
} from "../../lib/util/slack";

describe("slack", () => {

    describe("checkChannelId", () => {

        it("should accept a valid ID", () => {
            ["CH4RL1312", "C2KDBBLBA"].forEach(i => {
                assert(isChannel(i));
            });
        });

        it("should require capital letters", () => {
            assert(!isChannel("ch4r1i3"));
        });

        it("should reject DMs", () => {
            ["D1LL0N123", "D7F0EFEJ2"].forEach(i => {
                assert(!isChannel(i));
            });
        });

        it("should accept private group chats", () => {
            ["GR8W1D0PN", "G767PBQBG"].forEach(i => {
                assert(isChannel(i));
            });
        });

    });

    describe("checkIsSlack", () => {

        it("should report false for any MS Team channel ID", () => {
            assert(!isSlack("12:a347e001ebcd4f02ab3a086c1ddb0a03@thread.skype"));
        });

        it("should report true for any other type of channel ID (good or bad)", () => {
            ["D1LL0N123", "GR8W1D0PN", "C2KDBBLBA", "ch4r1i3", "not a real id", "" ].forEach(i => {
                assert(isSlack(i));
            });
        });

    });

});
