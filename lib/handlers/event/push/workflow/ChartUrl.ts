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

import * as _ from "lodash";
import { WorkflowStage } from "./WorkflowStage";

export function chartUrlFromWorkflow(stages: WorkflowStage[]): string {
    const stageNames = stages.map(s => s.name);
    const longestDuration = _.max(stages.filter(s => s.status).map(s => s.status.totalDuration));

    let scaleText = "in seconds";
    let scale = 1000;
    if (longestDuration > 600000) {
        scaleText = "in minutes";
        scale = 60000;
    }
    const chartHeight = 100 + stages.length * 10;

    const durationPlaceholder = _.round((longestDuration * .02) / scale);

    const longestDurations: number[] = [];
    const remainingDurations: number[] = [];
    const failureDurations: number[] = [];
    const progressDurations: number[] = [];
    stages.forEach(s => {
        let longestDurationForStage = 0;
        let remainingDuration = 0;
        let failureDuration = 0;
        let progressDuration = 0;
        if (s.status) {
            if (s.status.state === "passed") {
                longestDurationForStage = _.round(s.status.longestJobDuration / scale);
                if (longestDurationForStage < durationPlaceholder) {
                    longestDurationForStage = durationPlaceholder;
                } else {
                    remainingDuration = _.round(s.status.totalDuration / scale) - longestDurationForStage;
                }
            }
            if (s.status.state === "failed") {
                failureDuration = _.max([durationPlaceholder, _.round(s.status.totalDuration / scale)]);
            }
            if (s.status.state === "started") {
                progressDuration = _.max([durationPlaceholder, _.round(s.status.totalDuration / scale)]);
            }
        }
        longestDurations.push(longestDurationForStage);
        remainingDurations.push(remainingDuration);
        failureDurations.push(failureDuration);
        progressDurations.push(progressDuration);
    });
    const stageNamesString = `|${stageNames.join("|")}|`;
    const url = `https://image-charts.com/chart?chs=400x${chartHeight}&cht=bhs&` +
        `chd=t:${longestDurations.join(",")}|${remainingDurations.join(",")}` +
        `|${failureDurations.join(",")}|${progressDurations.join(",")}&` +
        `chds=a&chco=0FA215,86DB95,DD5B6A,E9D139&chxt=x,y&chxl=0:${stageNamesString}&` +
        `chtt=Workflow%20Stage%20Durations%20(${scaleText})&chts=000000,10&chof=.png`;
    return _.replace(url, new RegExp(" ", "g"), "%20");
}
