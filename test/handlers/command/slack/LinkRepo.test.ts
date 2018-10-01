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

import { LinkRepo } from "../../../../lib/handlers/command/slack/LinkRepo";

describe("LinkRepo", () => {

    describe("linkRepoCommand", () => {

        const r = "sams-town";
        const o = "the-killers";
        const b = "when-you_were-young";

        it("should respond with defaults", () => {
            assert(LinkRepo.linkRepoCommand() === `@atomist repo owner=OWNER name=REPO`);
        });

        it("should respond with bot", () => {
            assert(LinkRepo.linkRepoCommand(b) === `@${b} repo owner=OWNER name=REPO`);
        });

        it("should respond with repo and owner", () => {
            assert(LinkRepo.linkRepoCommand(b, o) === `@${b} repo owner=${o} name=REPO`);
        });

        it("should respond with repo, owner, and bot", () => {
            assert(LinkRepo.linkRepoCommand(b, o, r) === `@${b} repo owner=${o} name=${r}`);
        });

    });

});
