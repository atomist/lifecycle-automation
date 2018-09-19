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
import * as toposort from "toposort";
import { SdmGoalsByCommit } from "../typings/types";

export interface EnvironmentWithGoals {
    environment: string;
    goals: SdmGoalsByCommit.SdmGoal[];
}

export function lastGoalSet(allGoals: SdmGoalsByCommit.SdmGoal[] = []): SdmGoalsByCommit.SdmGoal[] {
    // find latest goal set
    const goalSet = _.maxBy(_.map(_.groupBy(allGoals, g => g.goalSetId), v => {
        return ({ goalSetId: v[0].goalSetId, ts: _.max(v.map(vv => vv.ts))});
    }), "ts");

    // only maintain latest version of SdmGoals
    const goals: SdmGoalsByCommit.SdmGoal[] = [];
    _.forEach(_.groupBy(allGoals.filter(g => g.goalSetId === goalSet.goalSetId),
            g => `${g.environment}-${g.name}`), v => {
        // using the ts property might not be good enough but let's see
        goals.push(_.maxBy(v, "ts"));
    });

    return goals;
}

export function sortGoals(allGoals: SdmGoalsByCommit.SdmGoal[] = []): EnvironmentWithGoals[] {
    // only maintain latest version of SdmGoals
    const goals = lastGoalSet(allGoals);

    try {

        // sort envs first
        const envConditions = _.flatten(goals.filter(g => g.preConditions && g.preConditions.length > 0)
            .map(g => g.preConditions.map(p => {
                if (g.environment !== p.environment) {
                    return [g.environment, p.environment];
                } else {
                    return null;
                }
            }))).filter(c => c !== null);

        let sortedGoalsWithEnvironment: EnvironmentWithGoals[];
        try {
            const sortedEnvs = toposort(envConditions).reverse();

            // if we have no conditions between goals of different environments we need up manually add all envs
            if (sortedEnvs.length === 0) {
                sortedEnvs.push(..._.uniq(goals.map(g => g.environment)));
            }

            // add the goals per each environment
            sortedGoalsWithEnvironment = sortedEnvs.map(env => ({
                environment: env,
                goals: goals.filter(g => g.environment === env),
            }));
        } catch (err) {
            // this means we can't order the envs due to some cyclic dependencies
            sortedGoalsWithEnvironment = [{
                environment: goals[0].environment,
                goals: goals.map(g => {
                    if (g.preConditions) {
                        g.preConditions.forEach(pc => pc.environment = goals[0].environment);
                    }
                    return g;
                }),
            }];
        }

        // sort goals within an environment
        sortedGoalsWithEnvironment.forEach(env => {
            const goalConditions = _.flatten(env.goals.map(g => {
                const preConditions = (g.preConditions || []).filter(p => p.environment === env.environment);
                if (preConditions.length > 0) {
                    return preConditions.map(p => [g.name, p.name]) as any;
                } else {
                    return [[g.name, env.environment]] as any;
                }
            }));
            const sortedGoals = toposort(goalConditions).reverse();
            env.goals = _.sortBy<SdmGoalsByCommit.SdmGoal>(env.goals, g => sortedGoals.indexOf(g.name))
                .sort((g1, g2) => {
                    if ((!g1.preConditions || g1.preConditions.length === 0)
                        && (!g2.preConditions || g2.preConditions.length === 0)) {
                        return g1.name.localeCompare(g2.name);
                    } else if (!g1.preConditions || g1.preConditions.length === 0) {
                        return -1;
                        return 0;
                    } else if (!g2.preConditions || g2.preConditions.length === 0) {
                        return 1;

                    } else {
                        return 0;
                    }
                });
        });

        return sortedGoalsWithEnvironment;

    } catch (err) {
        return [{
            environment: goals[0].environment,
            goals,
        }];
    }
}
