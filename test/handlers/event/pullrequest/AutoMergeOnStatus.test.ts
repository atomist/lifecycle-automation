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

import { Success } from "@atomist/automation-client";

import { AutoMergeOnStatus } from "../../../../src/handlers/event/pullrequest/AutoMergeOnStatus";

describe("AutoMergeOnStatus", () => {

    describe("handle", () => {

        it("should handle no pull requests", done => {
            const event = {
                data: { Status: [{ commit: {} }] },
                extensions: { operationName: "nothing" },
            };
            const amos = new AutoMergeOnStatus();
            amos.handle(event, {} as any)
                .then(result => {
                    assert(result === Success);
                })
                .then(done, done);
        });

    });

});
