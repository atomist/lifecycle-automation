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

import * as yaml from "js-yaml";
import * as _ from "lodash";
import * as graphql from "../../../../typings/types";
import { WorkflowStage } from "./WorkflowStage";

export interface PushTrigger {
    name: string;
    type: PushType;
}

export type PushType = "branch" | "tag";

function findMatchingRegex(text: string, regexes: string[]): string {
    return regexes.find(r => new RegExp(r.replace(new RegExp("^/(.*?)/"), "$1")).test(text));
}

export function circleWorkflowtoStages(
    workflow: graphql.PushFields.Workflow,
    workflowPush: PushTrigger = { name: "master", type: "branch" },
): WorkflowStage[] {

    const doc = yaml.load(workflow.config);
    const jobsConfig = (_.find(_.values(doc.workflows), v => v.jobs) as any).jobs;
    const stages: Stage[] = [];
    jobsConfig.forEach(jc => {
        const name = typeof jc === "string" ? jc : _.head(_.keys(jc));
        const jobConfig = !jc[name] ? {} : jc[name];

        let filtered = false;
        const filters = jobConfig.filters ? jobConfig.filters : {};
        if (workflowPush.type === "branch") {
            const filtersBranches = filters.branches ? filters.branches : {};
            const filtersBranchesOnly = filtersBranches.only ? filtersBranches.only : [];
            const onlyBranches = typeof filtersBranchesOnly === "string" ? [filtersBranchesOnly] : filtersBranchesOnly;
            const filtersBranchesIgnore = filtersBranches.ignore ? filtersBranches.ignore : [];
            const ignoreBranches = typeof filtersBranchesIgnore === "string" ?
                [filtersBranchesIgnore] : filtersBranchesIgnore;
            const ignoreMatch = findMatchingRegex(workflowPush.name, ignoreBranches);
            if (ignoreMatch) {
                filtered = true;
            } else {
                if (onlyBranches.length > 0) {
                    filtered = true;
                    if (!!findMatchingRegex(workflowPush.name, onlyBranches)) {
                        filtered = false;
                    }
                }
            }
        }
        if (workflowPush.type === "tag") {
            const filtersTags = filters.tags ? filters.tags : {};
            const filtersTagsOnly = filtersTags.only ? filtersTags.only : [];
            const onlyTags = typeof filtersTagsOnly === "string" ? [filtersTagsOnly] : filtersTagsOnly;
            const filtersTagsIgnore = filtersTags.ignore ? filtersTags.ignore : [];
            const ignoreTags = typeof filtersTagsIgnore === "string" ? [filtersTagsIgnore] : filtersTagsIgnore;
            filtered = !(ignoreTags.length > 0);
            const ignoreMatch = findMatchingRegex(workflowPush.name, ignoreTags);
            if (ignoreMatch) {
                filtered = true;
            } else {
                if (onlyTags.length > 0) {
                    filtered = true;
                    if (!!findMatchingRegex(workflowPush.name, onlyTags)) {
                        filtered = false;
                    }
                }
            }
        }

        if (!filtered) {
            const requires = !jobConfig.requires ? [] : jobConfig.requires;
            let stage = _.find(stages, j => _.isEqual(j.require, requires));
            if (!stage) {
                stage = {
                    jobs: [name],
                    require: requires,
                };
                stages.push(stage);
            } else {
                stage.jobs.push(name);
            }
        }
    });

    const orderedStages: Stage[] = [];
    const visitedJobs = [];

    let stagesRequiringOnlyVisitedJobs: Stage[] = [];
    do {
        const remainingStages: Stage[] = _.clone(stages);
        _.remove(remainingStages, s => _.includes(orderedStages, s));
        stagesRequiringOnlyVisitedJobs = remainingStages.
            filter(s => _.every(s.require, r => _.includes(visitedJobs, r)));
        const newlyVisitedJobs: string[] = _.uniq(_.flatMap(stagesRequiringOnlyVisitedJobs, s => s.jobs));
        newlyVisitedJobs.forEach(j => visitedJobs.push(j));
        stagesRequiringOnlyVisitedJobs.sort((stage1, stage2) => {
            const executedJobNames: string[] = workflow.builds.map(build => build.jobName);
            const unexecutedJobsInStage1 = _.without(stage1.jobs, ...executedJobNames);
            const unexecutedJobsInStage2 = _.without(stage2.jobs, ...executedJobNames);
            return unexecutedJobsInStage1.length - unexecutedJobsInStage2.length;
        });
        stagesRequiringOnlyVisitedJobs.forEach(s => orderedStages.push(s));
    } while (stagesRequiringOnlyVisitedJobs.length > 0);

    const workflowStages: WorkflowStage[] = _.map(orderedStages, s => {
        const buildsInStage = workflow.builds.filter(b => _.includes(s.jobs, b.jobName));
        let jobName = s.jobs[0];
        if (buildsInStage.length === 0) {
            return { name: jobName } as WorkflowStage;
        }
        let longestJobDuration = 0;
        let earliestStart;
        let latestEnd = 0;
        let isFailure = false;
        const executedJobNames: string[] = workflow.builds.map(build => build.jobName);
        const unexecutedJobsInStage = _.without(s.jobs, ...executedJobNames);
        const isComplete = unexecutedJobsInStage.length === 0 ? true : false;
        buildsInStage.forEach(b => {
            const startedAt = Date.parse(b.startedAt);
            const finishedAt = Date.parse(b.finishedAt);
            earliestStart = _.min([earliestStart, startedAt]);
            latestEnd = _.max([latestEnd, finishedAt]);
            const jobDuration = finishedAt - startedAt;
            if (b.status === "failed") {
                isFailure = true;
                jobName = b.jobName;
            }
            if (longestJobDuration < jobDuration) {
                longestJobDuration = jobDuration;
                if (!isFailure) {
                    jobName = b.jobName;
                }
            }
        });
        const state = isFailure ? "failed" : isComplete ? "passed" : "started";
        return {
            name: jobName,
            status: {
                state,
                totalDuration: latestEnd - earliestStart,
                longestJobDuration,
            },
        } as WorkflowStage;
    });
    return workflowStages;
}

interface Stage {
    jobs: string[];
    require: string[];
}
