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
import { chartUrlFromWorkflow } from "../../../../../lib/handlers/event/push/workflow/ChartUrl";
import { WorkflowStage } from "../../../../../lib/handlers/event/push/workflow/WorkflowStage";
import { BuildStatus } from "../../../../../lib/typings/types";

describe("ChartUrl", () => {

    it("construct chart url from mock up workflow stages", () => {
        const workflow: WorkflowStage[] = [
            {
                name: "build",
                status: {
                    state: "passed" as BuildStatus,
                    longestJobDuration: 2100000,
                    totalDuration: 2520000,
                },
            }, {
                name: "unit test",
                status: {
                    state: "passed" as BuildStatus,
                    longestJobDuration: 100,
                    totalDuration: 100,
                },
            }, {
                name: "integration test",
                status: {
                    state: "passed" as BuildStatus,
                    longestJobDuration: 15180000,
                    totalDuration: 15360000,
                },
            }, {
                name: "canary test",
                status: {
                    state: "passed" as BuildStatus,
                    longestJobDuration: 37200000,
                    totalDuration: 46200000,
                },
            }, {
                name: "staging",
                status: {
                    state: "failed" as BuildStatus,
                    longestJobDuration: 100,
                    totalDuration: 100,
                },
            }, {
                name: "prod",
            },
        ];
        const chartUrl = chartUrlFromWorkflow(workflow);
        const expectedChartUrl = "https://image-charts.com/chart?chs=400x160&cht=bhs&" +
            "chd=t:35,15,253,620,0,0|7,0,3,150,0,0|0,0,0,0,15,0|0,0,0,0,0,0&" +
            "chds=a&chco=0FA215,86DB95,DD5B6A,E9D139&chxt=x,y&" +
            "chxl=0:|build|unit%20test|integration%20test|canary%20test|staging|prod|&" +
            "chtt=Workflow%20Stage%20Durations%20(in%20minutes)&chts=000000,10&chof=.png";
        assert.deepEqual(chartUrl, expectedChartUrl);
    });

    it("construct chart url from completed workflow stages", () => {
        const workflow: WorkflowStage[] = [
            {
                name: "build",
                status: {
                    state: "passed" as BuildStatus,
                    totalDuration: 1952,
                    longestJobDuration: 1952,
                },
            }, {
                name: "one0",
                status: {
                    state: "passed" as BuildStatus,
                    totalDuration: 24445,
                    longestJobDuration: 23005,
                },
            }, {
                name: "test",
                status: {
                    state: "passed" as BuildStatus,
                    totalDuration: 6476,
                    longestJobDuration: 6476,
                },
            }, {
                name: "two0",
                status: {
                    state: "passed" as BuildStatus,
                    totalDuration: 33674,
                    longestJobDuration: 29347,
                },
            }, {
                name: "publish",
                status: {
                    state: "passed" as BuildStatus,
                    totalDuration: 982,
                    longestJobDuration: 982,
                },
            }, {
                name: "three1",
                status: {
                    state: "passed" as BuildStatus,
                    totalDuration: 2040,
                    longestJobDuration: 1216,
                },
            }, {
                name: "four0",
                status: {
                    state: "passed" as BuildStatus,
                    totalDuration: 21725,
                    longestJobDuration: 21725,
                },
            }, {
                name: "staging",
                status: {
                    state: "passed" as BuildStatus,
                    totalDuration: 1049,
                    longestJobDuration: 1049,
                },
            }, {
                name: "promote",
                status: {
                    state: "passed" as BuildStatus,
                    totalDuration: 1802,
                    longestJobDuration: 1802,
                },
            },
        ];
        const chartUrl = chartUrlFromWorkflow(workflow);
        const expectedChartUrl = "https://image-charts.com/chart?chs=400x190&cht=bhs&" +
            "chd=t:2,23,6,29,1,1,22,1,2|0,1,0,5,0,1,0,0,0|0,0,0,0,0,0,0,0,0|0,0,0,0,0,0,0,0,0&" +
            "chds=a&chco=0FA215,86DB95,DD5B6A,E9D139&chxt=x,y&" +
            "chxl=0:|build|one0|test|two0|publish|three1|four0|staging|promote|&" +
            "chtt=Workflow%20Stage%20Durations%20(in%20seconds)&chts=000000,10&chof=.png";
        assert.deepEqual(chartUrl, expectedChartUrl);
    });

    it("construct chart url from failed workflow stages", () => {
        const workflow: WorkflowStage[] = [
            {
                name: "build",
                status: {
                    state: "passed" as BuildStatus,
                    totalDuration: 1952,
                    longestJobDuration: 1952,
                },
            }, {
                name: "one1",
                status: {
                    state: "failed" as BuildStatus,
                    totalDuration: 6569,
                    longestJobDuration: 2357,
                },
            }, {
                name: "test",
            }, {
                name: "two0",
            }, {
                name: "publish",
            }, {
                name: "three0",
            }, {
                name: "four0",
            }, {
                name: "staging",
            }, {
                name: "promote",
            },
        ];
        const chartUrl = chartUrlFromWorkflow(workflow);
        const expectedChartUrl = "https://image-charts.com/chart?chs=400x190&cht=bhs&" +
            "chd=t:2,0,0,0,0,0,0,0,0|0,0,0,0,0,0,0,0,0|0,7,0,0,0,0,0,0,0|0,0,0,0,0,0,0,0,0&" +
            "chds=a&chco=0FA215,86DB95,DD5B6A,E9D139&" +
            "chxt=x,y&chxl=0:|build|one1|test|two0|publish|three0|four0|staging|promote|&" +
            "chtt=Workflow%20Stage%20Durations%20(in%20seconds)&chts=000000,10&chof=.png";
        assert.deepEqual(chartUrl, expectedChartUrl);
    });

    it("construct chart url with in progress workflow stage", () => {
        const workflow: WorkflowStage[] = [
            {
                name: "build",
                status: {
                    state: "passed" as BuildStatus,
                    totalDuration: 1952,
                    longestJobDuration: 1952,
                },
            }, {
                name: "one1",
                status: {
                    state: "started" as BuildStatus,
                    totalDuration: 6569,
                    longestJobDuration: 2357,
                },
            }, {
                name: "test",
            }, {
                name: "two0",
            }, {
                name: "publish",
            }, {
                name: "three0",
            }, {
                name: "four0",
            }, {
                name: "staging",
            }, {
                name: "promote",
            },
        ];
        const chartUrl = chartUrlFromWorkflow(workflow);
        const expectedChartUrl = "https://image-charts.com/chart?chs=400x190&cht=bhs&" +
            "chd=t:2,0,0,0,0,0,0,0,0|0,0,0,0,0,0,0,0,0|0,0,0,0,0,0,0,0,0|0,7,0,0,0,0,0,0,0&" +
            "chds=a&chco=0FA215,86DB95,DD5B6A,E9D139&" +
            "chxt=x,y&chxl=0:|build|one1|test|two0|publish|three0|four0|staging|promote|&" +
            "chtt=Workflow%20Stage%20Durations%20(in%20seconds)&chts=000000,10&chof=.png";
        assert.deepEqual(chartUrl, expectedChartUrl);
    });

});
