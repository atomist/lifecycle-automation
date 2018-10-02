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

import { LoggingConfig } from "@atomist/automation-client/internal/util/logger";
import * as _ from "lodash";
import "mocha";
import * as assert from "power-assert";
import { SdmGoalsByCommit } from "../../lib/typings/types";
import { sortGoals } from "../../lib/util/goals";

LoggingConfig.format = "cli";

describe("goals", () => {

    it("should sort goals", () => {
        const goal0: SdmGoalsByCommit.SdmGoal = {
            environment: "code",
            name: "review",
            ts: Date.now(),
        };
        const goal1: SdmGoalsByCommit.SdmGoal = {
            environment: "code",
            name: "autofix",
            ts: Date.now(),
        };
        const goal2: SdmGoalsByCommit.SdmGoal = {
            environment: "code",
            name: "build",
            ts: Date.now(),
        };
        const goal3: SdmGoalsByCommit.SdmGoal = {
            environment: "code",
            name: "docker build",
            preConditions: [{
                environment: "code",
                name: "build",
            }],
            ts: Date.now(),
        };
        const goal4: SdmGoalsByCommit.SdmGoal = {
            environment: "test",
            name: "deployToTest",
            preConditions: [{
                environment: "code",
                name: "build",
            }],
            ts: Date.now(),
        };
        const goal5: SdmGoalsByCommit.SdmGoal = {
            environment: "prod",
            name: "deployToProd",
            preConditions: [{
                environment: "test",
                name: "deployToTest",
            }],
            ts: Date.now(),
        };

        const sortedGoals = sortGoals([goal1, goal0, goal2, goal3, goal4, goal5]);
        assert.equal(sortedGoals.length, 3);
        assert.equal(sortedGoals[0].environment, "code");
        assert.equal(sortedGoals[1].environment, "test");
        assert.equal(sortedGoals[2].environment, "prod");
        assert.deepEqual(sortedGoals[0].goals, [goal1, goal2, goal0, goal3]);
        assert.deepEqual(sortedGoals[1].goals, [goal4]);
        assert.deepEqual(sortedGoals[2].goals, [goal5]);
    });

    it("sort goals for only one environment", () => {
        const goal1: SdmGoalsByCommit.SdmGoal = {
            environment: "code",
            name: "build",
            ts: Date.now(),
        };
        const goal2: SdmGoalsByCommit.SdmGoal = {
            environment: "code",
            name: "docker build",
            preConditions: [{
                environment: "code",
                name: "build",
            }],
            ts: Date.now(),
        };

        const sortedGoals = sortGoals(_.shuffle([goal1, goal2]));
        assert.equal(sortedGoals.length, 1);
        assert.equal(sortedGoals[0].environment, "code");
        assert.deepEqual(sortedGoals[0].goals, [goal1, goal2]);
    });

    it("handle cycle properly", () => {
        const goal1: SdmGoalsByCommit.SdmGoal = {
            environment: "code",
            name: "build",
            preConditions: [{
                environment: "code",
                name: "docker build",
            }],
            ts: Date.now(),
        };
        const goal2: SdmGoalsByCommit.SdmGoal = {
            environment: "code",
            name: "docker build",
            preConditions: [{
                environment: "code",
                name: "build",
            }],
            ts: Date.now(),
        };

        try {
            sortGoals(_.shuffle([goal1, goal2]));
        } catch (err) {
            assert(err.message.indexOf("Cyclic dependency") >= 0);
        }

    });

    /* tslint:disable */
    const twoGoalSets = `[
      {
        "description": "Planned: version",
        "goalSetId": "b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435",
        "preConditions": [],
        "uniqueName": "Version",
        "name": "version",
        "goalSet": "Deploy",
        "state": "requested",
        "ts": 1526659165123,
        "id": "0802844f-c376-5937-a8e9-f309e23a1a92",
        "url": null,
        "provenance": [
          {
            "name": "SetGoalsOnPush",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          }
        ],
        "environment": "0-code",
        "approval": null
      },
      {
        "description": "Deployed to Kubernetes namespace \`testing\`",
        "goalSetId": "b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "docker build"
          }
        ],
        "uniqueName": "DeployToTest",
        "name": "deploy to Test",
        "goalSet": "Deploy",
        "state": "success",
        "ts": 1526659444686,
        "id": "21a78c80-ae69-50b3-87ed-8b52c05ac612",
        "url": null,
        "provenance": [
          {
            "name": "KubeDeploy",
            "registration": "@atomist/k8-automation",
            "version": "0.7.4-20180507023611"
          },
          {
            "name": "RequestDownstreamGoalsOnGoalSuccess",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          },
          {
            "name": "SetGoalsOnPush",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          },
          {
            "name": "UpdateSdmGoalState",
            "registration": "@atomist/lifecycle-automation",
            "version": "0.8.1-20180518052229"
          }
        ],
        "environment": "1-staging",
        "approval": {
          "userId": "cd"
        }
      },
      {
        "description": "Docker build successful",
        "goalSetId": "b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          }
        ],
        "uniqueName": "DockerBuild",
        "name": "docker build",
        "goalSet": "Deploy",
        "state": "success",
        "ts": 1526659374268,
        "id": "20fda976-2a7b-516c-874d-dfb55ce0765e",
        "url": "http://rolar.cfapps.io/logs/T29E48P34/atomist/lifecycle-automation/eb2e86fffe1c4686eebd9211aaef47ea814d57bb/0-code/docker build/b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435/bb380d3c-0ddf-480b-b2f7-a5b36b94de55",
        "provenance": [
          {
            "name": "OnAnyRequestedSdmGoal",
            "registration": "@atomist/atomist-sdm-03c998ce-10c2-527f-94ee-8bf85246fafd",
            "version": "0.1.2-20180518092517"
          },
          {
            "name": "RequestDownstreamGoalsOnGoalSuccess",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          },
          {
            "name": "SetGoalsOnPush",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          }
        ],
        "environment": "0-code",
        "approval": null
      },
      {
        "description": "Deployed to Kubernetes namespace \`testing\`",
        "goalSetId": "b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "docker build"
          }
        ],
        "uniqueName": "DeployToTest",
        "name": "deploy to Test",
        "goalSet": "Deploy",
        "state": "waiting_for_approval",
        "ts": 1526659379389,
        "id": "2d54073f-f047-532b-bbe6-f21fc618b799",
        "url": null,
        "provenance": [
          {
            "name": "KubeDeploy",
            "registration": "@atomist/k8-automation",
            "version": "0.7.4-20180507023611"
          },
          {
            "name": "RequestDownstreamGoalsOnGoalSuccess",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          },
          {
            "name": "SetGoalsOnPush",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          }
        ],
        "environment": "1-staging",
        "approval": null
      },
      {
        "description": "Tagged",
        "goalSetId": "b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "docker build"
          },
          {
            "environment": "0-code",
            "name": "build"
          }
        ],
        "uniqueName": "Tag",
        "name": "tag",
        "goalSet": "Deploy",
        "state": "success",
        "ts": 1526659380344,
        "id": "15dae132-9ebc-58e0-8197-74eb7224330a",
        "url": "http://rolar.cfapps.io/logs/T29E48P34/atomist/lifecycle-automation/eb2e86fffe1c4686eebd9211aaef47ea814d57bb/0-code/tag/b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435/bb380d3c-0ddf-480b-b2f7-a5b36b94de55",
        "provenance": [
          {
            "name": "OnAnyRequestedSdmGoal",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          },
          {
            "name": "RequestDownstreamGoalsOnGoalSuccess",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          },
          {
            "name": "SetGoalsOnPush",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          }
        ],
        "environment": "0-code",
        "approval": null
      },
      {
        "description": "Ready to release Docker image",
        "goalSetId": "b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435",
        "preConditions": [
          {
            "environment": "1-staging",
            "name": "deploy to Test"
          }
        ],
        "uniqueName": "ReleaseDocker",
        "name": "release Docker image",
        "goalSet": "Deploy",
        "state": "requested",
        "ts": 1526659447620,
        "id": "30a12a42-41e3-56a8-bcfc-38af817d6397",
        "url": null,
        "provenance": [
          {
            "name": "RequestDownstreamGoalsOnGoalSuccess",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          },
          {
            "name": "SetGoalsOnPush",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          }
        ],
        "environment": "2-prod",
        "approval": null
      },
      {
        "description": "Ready to create release tag",
        "goalSetId": "b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435",
        "preConditions": [
          {
            "environment": "2-prod",
            "name": "release NPM package"
          },
          {
            "environment": "2-prod",
            "name": "release Docker image"
          }
        ],
        "uniqueName": "ReleaseTag",
        "name": "create release tag",
        "goalSet": "Deploy",
        "state": "requested",
        "ts": 1526659479117,
        "id": "22ac78bb-9660-5d38-9942-afdd9c88425c",
        "url": null,
        "provenance": [
          {
            "name": "RequestDownstreamGoalsOnGoalSuccess",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          },
          {
            "name": "SetGoalsOnPush",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          }
        ],
        "environment": "2-prod",
        "approval": null
      },
      {
        "description": "Ready to publish",
        "goalSetId": "b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          }
        ],
        "uniqueName": "Publish",
        "name": "publish",
        "goalSet": "Deploy",
        "state": "requested",
        "ts": 1526659286332,
        "id": "03790cc5-bc20-5f65-8c10-a72e83c08100",
        "url": null,
        "provenance": [
          {
            "name": "RequestDownstreamGoalsOnGoalSuccess",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          },
          {
            "name": "SetGoalsOnPush",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          }
        ],
        "environment": "0-code",
        "approval": null
      },
      {
        "description": "Ready to build",
        "goalSetId": "b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "autofix"
          }
        ],
        "uniqueName": "Build",
        "name": "build",
        "goalSet": "Deploy",
        "state": "requested",
        "ts": 1526659198684,
        "id": "3849393f-ee26-54de-a622-426e4c7e2995",
        "url": null,
        "provenance": [
          {
            "name": "RequestDownstreamGoalsOnGoalSuccess",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          },
          {
            "name": "SetGoalsOnPush",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          }
        ],
        "environment": "0-code",
        "approval": null
      },
      {
        "description": "Deployed to Kubernetes namespace \`production\`",
        "goalSetId": "b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435",
        "preConditions": [
          {
            "environment": "1-staging",
            "name": "deploy to Test"
          }
        ],
        "uniqueName": "ReDeployToProduction",
        "name": "redeploy to Prod",
        "goalSet": "Deploy",
        "state": "success",
        "ts": 1526665951298,
        "id": "25278841-ffb0-5a19-9e77-e5dba75e2385",
        "url": null,
        "provenance": [
          {
            "name": "KubeDeploy",
            "registration": "@atomist/k8-automation",
            "version": "0.7.4-20180507023611"
          },
          {
            "name": "KubeDeploy",
            "registration": "@atomist/k8-automation",
            "version": "0.7.4-20180507023611"
          },
          {
            "name": "RequestDownstreamGoalsOnGoalSuccess",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          },
          {
            "name": "SetGoalsOnPush",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          },
          {
            "name": "RollbackOnSentryAlert",
            "registration": "@atomist/sentry-automation",
            "version": "0.1.0"
          }
        ],
        "environment": "2-prod",
        "approval": null
      },
      {
        "description": "Redeploying to Kubernetes namespace \`production\`",
        "goalSetId": "08cb8b07-2e86-48df-975d-e466df2d61f0",
        "preConditions": [
          {
            "environment": "2-prod",
            "name": "redeploy to Prod"
          }
        ],
        "uniqueName": "ReReDeployToProduction",
        "name": "reredeploy to Prod",
        "goalSet": "Rollback",
        "state": "requested",
        "ts": 1526676419550,
        "id": "0abec9be-afee-593d-a95a-7df3dabf4c39",
        "url": null,
        "provenance": [
          {
            "name": "KubeDeploy",
            "registration": "@atomist/k8-automation",
            "version": "0.7.4-20180507023611"
          },
          {
            "name": "KubeDeploy",
            "registration": "@atomist/k8-automation",
            "version": "0.7.4-20180507023611"
          },
          {
            "name": "RequestDownstreamGoalsOnGoalSuccess",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          },
          {
            "name": "SetGoalsOnPush",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          },
          {
            "name": "RollbackOnSentryAlert",
            "registration": "@atomist/sentry-automation",
            "version": "0.1.0"
          },
          {
            "name": "RollbackDeployment",
            "registration": "@atomist/sentry-automation",
            "version": "0.1.0"
          }
        ],
        "environment": "10-redeploy",
        "approval": null
      },
      {
        "description": "Building...",
        "goalSetId": "b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "autofix"
          }
        ],
        "uniqueName": "Build",
        "name": "build",
        "goalSet": "Deploy",
        "state": "in_process",
        "ts": 1526659211539,
        "id": "19721083-369e-5ba3-ba1f-82a4e4aa1962",
        "url": "http://rolar.cfapps.io/logs/T29E48P34/atomist/lifecycle-automation/eb2e86fffe1c4686eebd9211aaef47ea814d57bb/0-code/build/b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435/bb380d3c-0ddf-480b-b2f7-a5b36b94de55",
        "provenance": [
          {
            "name": "OnAnyRequestedSdmGoal",
            "registration": "@atomist/atomist-sdm-3849393f-ee26-54de-a622-426e4c7e2995",
            "version": "0.1.2-20180518092517"
          },
          {
            "name": "RequestDownstreamGoalsOnGoalSuccess",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          },
          {
            "name": "SetGoalsOnPush",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          }
        ],
        "environment": "0-code",
        "approval": null
      },
      {
        "description": "Released Docker image",
        "goalSetId": "b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435",
        "preConditions": [
          {
            "environment": "1-staging",
            "name": "deploy to Test"
          }
        ],
        "uniqueName": "ReleaseDocker",
        "name": "release Docker image",
        "goalSet": "Deploy",
        "state": "success",
        "ts": 1526659468836,
        "id": "226694e6-9ca8-5abd-bd79-dda54cef8311",
        "url": "http://rolar.cfapps.io/logs/T29E48P34/atomist/lifecycle-automation/eb2e86fffe1c4686eebd9211aaef47ea814d57bb/2-prod/release Docker image/b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435/0db4333d-d255-4ce7-9bff-fd3e465550c4",
        "provenance": [
          {
            "name": "OnAnyRequestedSdmGoal",
            "registration": "@atomist/atomist-sdm-30a12a42-41e3-56a8-bcfc-38af817d6397",
            "version": "0.1.2-20180518092517"
          },
          {
            "name": "RequestDownstreamGoalsOnGoalSuccess",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          },
          {
            "name": "SetGoalsOnPush",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          }
        ],
        "environment": "2-prod",
        "approval": null
      },
      {
        "description": "Releasing NPM package...",
        "goalSetId": "b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435",
        "preConditions": [
          {
            "environment": "1-staging",
            "name": "deploy to Test"
          }
        ],
        "uniqueName": "ReleaseNpm",
        "name": "release NPM package",
        "goalSet": "Deploy",
        "state": "in_process",
        "ts": 1526659462892,
        "id": "1f3772b0-95d5-5001-bb15-543153fb5953",
        "url": "http://rolar.cfapps.io/logs/T29E48P34/atomist/lifecycle-automation/eb2e86fffe1c4686eebd9211aaef47ea814d57bb/2-prod/release NPM package/b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435/0db4333d-d255-4ce7-9bff-fd3e465550c4",
        "provenance": [
          {
            "name": "OnAnyRequestedSdmGoal",
            "registration": "@atomist/atomist-sdm-1129dbd4-63fd-5ab7-9bed-c3804330af1a",
            "version": "0.1.2-20180518092517"
          },
          {
            "name": "RequestDownstreamGoalsOnGoalSuccess",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          },
          {
            "name": "SetGoalsOnPush",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          }
        ],
        "environment": "2-prod",
        "approval": null
      },
      {
        "description": "Working: create release tag",
        "goalSetId": "b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435",
        "preConditions": [
          {
            "environment": "2-prod",
            "name": "release NPM package"
          },
          {
            "environment": "2-prod",
            "name": "release Docker image"
          }
        ],
        "uniqueName": "ReleaseTag",
        "name": "create release tag",
        "goalSet": "Deploy",
        "state": "in_process",
        "ts": 1526659482083,
        "id": "3d1be89b-1992-5df7-a536-0f098c87cedf",
        "url": "http://rolar.cfapps.io/logs/T29E48P34/atomist/lifecycle-automation/eb2e86fffe1c4686eebd9211aaef47ea814d57bb/2-prod/create release tag/b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435/0db4333d-d255-4ce7-9bff-fd3e465550c4",
        "provenance": [
          {
            "name": "OnAnyRequestedSdmGoal",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          },
          {
            "name": "RequestDownstreamGoalsOnGoalSuccess",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          },
          {
            "name": "SetGoalsOnPush",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          }
        ],
        "environment": "2-prod",
        "approval": null
      },
      {
        "description": "Ready to deploy to Prod",
        "goalSetId": "b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435",
        "preConditions": [
          {
            "environment": "1-staging",
            "name": "deploy to Test"
          }
        ],
        "uniqueName": "DeployToProduction",
        "name": "deploy to Prod",
        "goalSet": "Deploy",
        "state": "requested",
        "ts": 1526659447626,
        "id": "04ada4c4-b8df-5a9e-940b-703201be1d16",
        "url": null,
        "provenance": [
          {
            "name": "RequestDownstreamGoalsOnGoalSuccess",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          },
          {
            "name": "SetGoalsOnPush",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          }
        ],
        "environment": "2-prod",
        "approval": null
      },
      {
        "description": "Tagging...",
        "goalSetId": "b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "docker build"
          },
          {
            "environment": "0-code",
            "name": "build"
          }
        ],
        "uniqueName": "Tag",
        "name": "tag",
        "goalSet": "Deploy",
        "state": "in_process",
        "ts": 1526659379189,
        "id": "1628ddbe-6cfc-5030-a9e9-fe3a3ae6e9d6",
        "url": "http://rolar.cfapps.io/logs/T29E48P34/atomist/lifecycle-automation/eb2e86fffe1c4686eebd9211aaef47ea814d57bb/0-code/tag/b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435/bb380d3c-0ddf-480b-b2f7-a5b36b94de55",
        "provenance": [
          {
            "name": "OnAnyRequestedSdmGoal",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          },
          {
            "name": "RequestDownstreamGoalsOnGoalSuccess",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          },
          {
            "name": "SetGoalsOnPush",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          }
        ],
        "environment": "0-code",
        "approval": null
      },
      {
        "description": "Ready to deploy to Test",
        "goalSetId": "b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "docker build"
          }
        ],
        "uniqueName": "DeployToTest",
        "name": "deploy to Test",
        "goalSet": "Deploy",
        "state": "requested",
        "ts": 1526659376316,
        "id": "0a4d171b-2fd3-5a17-997a-e7ed32fdb45f",
        "url": null,
        "provenance": [
          {
            "name": "RequestDownstreamGoalsOnGoalSuccess",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          },
          {
            "name": "SetGoalsOnPush",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          }
        ],
        "environment": "1-staging",
        "approval": null
      },
      {
        "description": "Ready to docker build",
        "goalSetId": "b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          }
        ],
        "uniqueName": "DockerBuild",
        "name": "docker build",
        "goalSet": "Deploy",
        "state": "requested",
        "ts": 1526659286332,
        "id": "03c998ce-10c2-527f-94ee-8bf85246fafd",
        "url": null,
        "provenance": [
          {
            "name": "RequestDownstreamGoalsOnGoalSuccess",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          },
          {
            "name": "SetGoalsOnPush",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          }
        ],
        "environment": "0-code",
        "approval": null
      },
      {
        "description": "Running code reviews...",
        "goalSetId": "b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435",
        "preConditions": [],
        "uniqueName": "Review",
        "name": "review",
        "goalSet": "Deploy",
        "state": "in_process",
        "ts": 1526659169132,
        "id": "361ecabf-f4a3-5e0f-b2cc-b89484d978a0",
        "url": "http://rolar.cfapps.io/logs/T29E48P34/atomist/lifecycle-automation/eb2e86fffe1c4686eebd9211aaef47ea814d57bb/0-code/review/b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435/bb380d3c-0ddf-480b-b2f7-a5b36b94de55",
        "provenance": [
          {
            "name": "OnAnyRequestedSdmGoal",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          },
          {
            "name": "SetGoalsOnPush",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          }
        ],
        "environment": "0-code",
        "approval": null
      },
      {
        "description": "Code review passed",
        "goalSetId": "b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435",
        "preConditions": [],
        "uniqueName": "Review",
        "name": "review",
        "goalSet": "Deploy",
        "state": "success",
        "ts": 1526659169141,
        "id": "210ae273-28c3-5741-a0c1-12a17915f5e1",
        "url": "http://rolar.cfapps.io/logs/T29E48P34/atomist/lifecycle-automation/eb2e86fffe1c4686eebd9211aaef47ea814d57bb/0-code/review/b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435/bb380d3c-0ddf-480b-b2f7-a5b36b94de55",
        "provenance": [
          {
            "name": "OnAnyRequestedSdmGoal",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          },
          {
            "name": "SetGoalsOnPush",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          }
        ],
        "environment": "0-code",
        "approval": null
      },
      {
        "description": "Planned: release NPM package",
        "goalSetId": "b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435",
        "preConditions": [
          {
            "environment": "1-staging",
            "name": "deploy to Test"
          }
        ],
        "uniqueName": "ReleaseNpm",
        "name": "release NPM package",
        "goalSet": "Deploy",
        "state": "planned",
        "ts": 1526659165124,
        "id": "0d3a3bee-4393-5b49-a50f-7e13075c71ae",
        "url": null,
        "provenance": [
          {
            "name": "SetGoalsOnPush",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          }
        ],
        "environment": "2-prod",
        "approval": null
      },
      {
        "description": "Planned: deploy to Prod",
        "goalSetId": "b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435",
        "preConditions": [
          {
            "environment": "1-staging",
            "name": "deploy to Test"
          }
        ],
        "uniqueName": "DeployToProduction",
        "name": "deploy to Prod",
        "goalSet": "Deploy",
        "state": "planned",
        "ts": 1526659165124,
        "id": "3f1bd669-e6c2-556d-8022-33d141ba0c1f",
        "url": null,
        "provenance": [
          {
            "name": "SetGoalsOnPush",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          }
        ],
        "environment": "2-prod",
        "approval": null
      },
      {
        "description": "Planned: deploy to Test",
        "goalSetId": "b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "docker build"
          }
        ],
        "uniqueName": "DeployToTest",
        "name": "deploy to Test",
        "goalSet": "Deploy",
        "state": "planned",
        "ts": 1526659165123,
        "id": "26cd5852-1f42-5e82-9e60-99d9c04fb0dd",
        "url": null,
        "provenance": [
          {
            "name": "SetGoalsOnPush",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          }
        ],
        "environment": "1-staging",
        "approval": null
      },
      {
        "description": "Releasing Docker image...",
        "goalSetId": "b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435",
        "preConditions": [
          {
            "environment": "1-staging",
            "name": "deploy to Test"
          }
        ],
        "uniqueName": "ReleaseDocker",
        "name": "release Docker image",
        "goalSet": "Deploy",
        "state": "in_process",
        "ts": 1526659462761,
        "id": "19fa27d7-a931-598a-af08-0c04fe745c00",
        "url": "http://rolar.cfapps.io/logs/T29E48P34/atomist/lifecycle-automation/eb2e86fffe1c4686eebd9211aaef47ea814d57bb/2-prod/release Docker image/b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435/0db4333d-d255-4ce7-9bff-fd3e465550c4",
        "provenance": [
          {
            "name": "OnAnyRequestedSdmGoal",
            "registration": "@atomist/atomist-sdm-30a12a42-41e3-56a8-bcfc-38af817d6397",
            "version": "0.1.2-20180518092517"
          },
          {
            "name": "RequestDownstreamGoalsOnGoalSuccess",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          },
          {
            "name": "SetGoalsOnPush",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          }
        ],
        "environment": "2-prod",
        "approval": null
      },
      {
        "description": "Publishing...",
        "goalSetId": "b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          }
        ],
        "uniqueName": "Publish",
        "name": "publish",
        "goalSet": "Deploy",
        "state": "in_process",
        "ts": 1526659299303,
        "id": "15c5e2e1-7caf-5a40-a004-c62ddfc69cac",
        "url": "http://rolar.cfapps.io/logs/T29E48P34/atomist/lifecycle-automation/eb2e86fffe1c4686eebd9211aaef47ea814d57bb/0-code/publish/b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435/bb380d3c-0ddf-480b-b2f7-a5b36b94de55",
        "provenance": [
          {
            "name": "OnAnyRequestedSdmGoal",
            "registration": "@atomist/atomist-sdm-03790cc5-bc20-5f65-8c10-a72e83c08100",
            "version": "0.1.2-20180518092517"
          },
          {
            "name": "RequestDownstreamGoalsOnGoalSuccess",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          },
          {
            "name": "SetGoalsOnPush",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          }
        ],
        "environment": "0-code",
        "approval": null
      },
      {
        "description": "Ready to release NPM package",
        "goalSetId": "b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435",
        "preConditions": [
          {
            "environment": "1-staging",
            "name": "deploy to Test"
          }
        ],
        "uniqueName": "ReleaseNpm",
        "name": "release NPM package",
        "goalSet": "Deploy",
        "state": "requested",
        "ts": 1526659447617,
        "id": "1129dbd4-63fd-5ab7-9bed-c3804330af1a",
        "url": null,
        "provenance": [
          {
            "name": "RequestDownstreamGoalsOnGoalSuccess",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          },
          {
            "name": "SetGoalsOnPush",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          }
        ],
        "environment": "2-prod",
        "approval": null
      },
      {
        "description": "Ready to tag",
        "goalSetId": "b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "docker build"
          },
          {
            "environment": "0-code",
            "name": "build"
          }
        ],
        "uniqueName": "Tag",
        "name": "tag",
        "goalSet": "Deploy",
        "state": "requested",
        "ts": 1526659376282,
        "id": "01c3a61c-7b3b-5e02-8d85-77bbb4660bd6",
        "url": null,
        "provenance": [
          {
            "name": "RequestDownstreamGoalsOnGoalSuccess",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          },
          {
            "name": "SetGoalsOnPush",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          }
        ],
        "environment": "0-code",
        "approval": null
      },
      {
        "description": "Redeploying to Kubernetes namespace \`production\`",
        "goalSetId": "b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435",
        "preConditions": [
          {
            "environment": "2-prod",
            "name": "redeploy to Prod"
          }
        ],
        "uniqueName": "ReReDeployToProduction",
        "name": "reredeploy to Prod",
        "goalSet": "Deploy",
        "state": "requested",
        "ts": 1526673268100,
        "id": "01134cf1-b72b-5593-8784-6d68bbd2c2d5",
        "url": null,
        "provenance": [
          {
            "name": "KubeDeploy",
            "registration": "@atomist/k8-automation",
            "version": "0.7.4-20180507023611"
          },
          {
            "name": "KubeDeploy",
            "registration": "@atomist/k8-automation",
            "version": "0.7.4-20180507023611"
          },
          {
            "name": "RequestDownstreamGoalsOnGoalSuccess",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          },
          {
            "name": "SetGoalsOnPush",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          },
          {
            "name": "RollbackOnSentryAlert",
            "registration": "@atomist/sentry-automation",
            "version": "0.1.0"
          },
          {
            "name": "RollbackOnSentryAlert",
            "registration": "@atomist/sentry-automation",
            "version": "0.1.0"
          }
        ],
        "environment": "10-redeploy",
        "approval": null
      },
      {
        "description": "Deployed to Kubernetes namespace \`production\`",
        "goalSetId": "b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435",
        "preConditions": [
          {
            "environment": "2-prod",
            "name": "redeploy to Prod"
          }
        ],
        "uniqueName": "ReReDeployToProduction",
        "name": "reredeploy to Prod",
        "goalSet": "Deploy",
        "state": "success",
        "ts": 1526673271484,
        "id": "34f875fe-85a3-5e12-83fa-71a046fa3885",
        "url": null,
        "provenance": [
          {
            "name": "KubeDeploy",
            "registration": "@atomist/k8-automation",
            "version": "0.7.4-20180507023611"
          },
          {
            "name": "KubeDeploy",
            "registration": "@atomist/k8-automation",
            "version": "0.7.4-20180507023611"
          },
          {
            "name": "KubeDeploy",
            "registration": "@atomist/k8-automation",
            "version": "0.7.4-20180507023611"
          },
          {
            "name": "RequestDownstreamGoalsOnGoalSuccess",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          },
          {
            "name": "SetGoalsOnPush",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          },
          {
            "name": "RollbackOnSentryAlert",
            "registration": "@atomist/sentry-automation",
            "version": "0.1.0"
          },
          {
            "name": "RollbackOnSentryAlert",
            "registration": "@atomist/sentry-automation",
            "version": "0.1.0"
          }
        ],
        "environment": "10-redeploy",
        "approval": null
      },
      {
        "description": "Published",
        "goalSetId": "b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          }
        ],
        "uniqueName": "Publish",
        "name": "publish",
        "goalSet": "Deploy",
        "state": "success",
        "ts": 1526659343226,
        "id": "23be435a-abe9-54c5-a4ff-02d89a35dcb4",
        "url": "https://registry.npmjs.org/@atomist/lifecycle-automation/-/@atomist/lifecycle-automation-0.8.2-20180518155930.tgz",
        "provenance": [
          {
            "name": "OnAnyRequestedSdmGoal",
            "registration": "@atomist/atomist-sdm-03790cc5-bc20-5f65-8c10-a72e83c08100",
            "version": "0.1.2-20180518092517"
          },
          {
            "name": "RequestDownstreamGoalsOnGoalSuccess",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          },
          {
            "name": "SetGoalsOnPush",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          }
        ],
        "environment": "0-code",
        "approval": null
      },
      {
        "description": "Calculating project version...",
        "goalSetId": "b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435",
        "preConditions": [],
        "uniqueName": "Version",
        "name": "version",
        "goalSet": "Deploy",
        "state": "in_process",
        "ts": 1526659169088,
        "id": "10d45f0d-e608-51bd-86a0-c7884617e036",
        "url": "http://rolar.cfapps.io/logs/T29E48P34/atomist/lifecycle-automation/eb2e86fffe1c4686eebd9211aaef47ea814d57bb/0-code/version/b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435/bb380d3c-0ddf-480b-b2f7-a5b36b94de55",
        "provenance": [
          {
            "name": "OnAnyRequestedSdmGoal",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          },
          {
            "name": "SetGoalsOnPush",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          }
        ],
        "environment": "0-code",
        "approval": null
      },
      {
        "description": "Versioned",
        "goalSetId": "b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435",
        "preConditions": [],
        "uniqueName": "Version",
        "name": "version",
        "goalSet": "Deploy",
        "state": "success",
        "ts": 1526659171138,
        "id": "17891039-ebc9-535a-bcad-faf3a5bcf937",
        "url": "http://rolar.cfapps.io/logs/T29E48P34/atomist/lifecycle-automation/eb2e86fffe1c4686eebd9211aaef47ea814d57bb/0-code/version/b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435/bb380d3c-0ddf-480b-b2f7-a5b36b94de55",
        "provenance": [
          {
            "name": "OnAnyRequestedSdmGoal",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          },
          {
            "name": "SetGoalsOnPush",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          }
        ],
        "environment": "0-code",
        "approval": null
      },
      {
        "description": "Planned: release Docker image",
        "goalSetId": "b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435",
        "preConditions": [
          {
            "environment": "1-staging",
            "name": "deploy to Test"
          }
        ],
        "uniqueName": "ReleaseDocker",
        "name": "release Docker image",
        "goalSet": "Deploy",
        "state": "planned",
        "ts": 1526659165124,
        "id": "28331bcf-2be7-5b22-9772-88b0ee121175",
        "url": null,
        "provenance": [
          {
            "name": "SetGoalsOnPush",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          }
        ],
        "environment": "2-prod",
        "approval": null
      },
      {
        "description": "Planned: docker build",
        "goalSetId": "b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          }
        ],
        "uniqueName": "DockerBuild",
        "name": "docker build",
        "goalSet": "Deploy",
        "state": "planned",
        "ts": 1526659165123,
        "id": "157bcda1-abe1-5442-9822-15d0409e19fe",
        "url": null,
        "provenance": [
          {
            "name": "SetGoalsOnPush",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          }
        ],
        "environment": "0-code",
        "approval": null
      },
      {
        "description": "Planned: publish",
        "goalSetId": "b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          }
        ],
        "uniqueName": "Publish",
        "name": "publish",
        "goalSet": "Deploy",
        "state": "planned",
        "ts": 1526659165123,
        "id": "3860f9e2-5b29-5c8c-ad2c-72ac3afb7390",
        "url": null,
        "provenance": [
          {
            "name": "SetGoalsOnPush",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          }
        ],
        "environment": "0-code",
        "approval": null
      },
      {
        "description": "Planned: build",
        "goalSetId": "b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "autofix"
          }
        ],
        "uniqueName": "Build",
        "name": "build",
        "goalSet": "Deploy",
        "state": "planned",
        "ts": 1526659165112,
        "id": "102cd36f-bef2-5715-9122-bb4f2b9ec4e7",
        "url": null,
        "provenance": [
          {
            "name": "SetGoalsOnPush",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          }
        ],
        "environment": "0-code",
        "approval": null
      },
      {
        "description": "Planned: autofix",
        "goalSetId": "b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435",
        "preConditions": [],
        "uniqueName": "Autofix",
        "name": "autofix",
        "goalSet": "Deploy",
        "state": "requested",
        "ts": 1526659165102,
        "id": "341461f5-6edf-5677-b85f-354c8d13110a",
        "url": null,
        "provenance": [
          {
            "name": "SetGoalsOnPush",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          }
        ],
        "environment": "0-code",
        "approval": null
      },
      {
        "description": "Deployed to Kubernetes namespace \`production\`",
        "goalSetId": "b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435",
        "preConditions": [
          {
            "environment": "1-staging",
            "name": "deploy to Test"
          }
        ],
        "uniqueName": "DeployToProduction",
        "name": "deploy to Prod",
        "goalSet": "Deploy",
        "state": "success",
        "ts": 1526659451088,
        "id": "1693bdc9-1389-5657-a844-559b997f6a28",
        "url": null,
        "provenance": [
          {
            "name": "KubeDeploy",
            "registration": "@atomist/k8-automation",
            "version": "0.7.4-20180507023611"
          },
          {
            "name": "RequestDownstreamGoalsOnGoalSuccess",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          },
          {
            "name": "SetGoalsOnPush",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          }
        ],
        "environment": "2-prod",
        "approval": null
      },
      {
        "description": "Released NPM package",
        "goalSetId": "b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435",
        "preConditions": [
          {
            "environment": "1-staging",
            "name": "deploy to Test"
          }
        ],
        "uniqueName": "ReleaseNpm",
        "name": "release NPM package",
        "goalSet": "Deploy",
        "state": "success",
        "ts": 1526659477027,
        "id": "10749d1b-02d8-5529-bdd9-a1d63b35822d",
        "url": "https://registry.npmjs.org/@atomist/lifecycle-automation/-/@atomist/lifecycle-automation-0.8.2.tgz",
        "provenance": [
          {
            "name": "OnAnyRequestedSdmGoal",
            "registration": "@atomist/atomist-sdm-1129dbd4-63fd-5ab7-9bed-c3804330af1a",
            "version": "0.1.2-20180518092517"
          },
          {
            "name": "RequestDownstreamGoalsOnGoalSuccess",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          },
          {
            "name": "SetGoalsOnPush",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          }
        ],
        "environment": "2-prod",
        "approval": null
      },
      {
        "description": "Redeploying to Kubernetes namespace \`production\`",
        "goalSetId": "b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435",
        "preConditions": [
          {
            "environment": "1-staging",
            "name": "deploy to Test"
          }
        ],
        "uniqueName": "ReDeployToProduction",
        "name": "redeploy to Prod",
        "goalSet": "Deploy",
        "state": "requested",
        "ts": 1526665948001,
        "id": "29880780-4e40-5417-abbd-93e2ca10f9cb",
        "url": null,
        "provenance": [
          {
            "name": "KubeDeploy",
            "registration": "@atomist/k8-automation",
            "version": "0.7.4-20180507023611"
          },
          {
            "name": "RequestDownstreamGoalsOnGoalSuccess",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          },
          {
            "name": "SetGoalsOnPush",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          },
          {
            "name": "RollbackOnSentryAlert",
            "registration": "@atomist/sentry-automation",
            "version": "0.1.0"
          }
        ],
        "environment": "2-prod",
        "approval": null
      },
      {
        "description": "Created release tag",
        "goalSetId": "b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435",
        "preConditions": [
          {
            "environment": "2-prod",
            "name": "release NPM package"
          },
          {
            "environment": "2-prod",
            "name": "release Docker image"
          }
        ],
        "uniqueName": "ReleaseTag",
        "name": "create release tag",
        "goalSet": "Deploy",
        "state": "success",
        "ts": 1526659483392,
        "id": "068842e7-7161-5717-ba1f-894d08e0e561",
        "url": "http://rolar.cfapps.io/logs/T29E48P34/atomist/lifecycle-automation/eb2e86fffe1c4686eebd9211aaef47ea814d57bb/2-prod/create release tag/b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435/0db4333d-d255-4ce7-9bff-fd3e465550c4",
        "provenance": [
          {
            "name": "OnAnyRequestedSdmGoal",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          },
          {
            "name": "RequestDownstreamGoalsOnGoalSuccess",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          },
          {
            "name": "SetGoalsOnPush",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          }
        ],
        "environment": "2-prod",
        "approval": null
      },
      {
        "description": "Running Docker build...",
        "goalSetId": "b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          }
        ],
        "uniqueName": "DockerBuild",
        "name": "docker build",
        "goalSet": "Deploy",
        "state": "in_process",
        "ts": 1526659299053,
        "id": "336512e0-2db0-5983-98ce-429e088e75f6",
        "url": "http://rolar.cfapps.io/logs/T29E48P34/atomist/lifecycle-automation/eb2e86fffe1c4686eebd9211aaef47ea814d57bb/0-code/docker build/b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435/bb380d3c-0ddf-480b-b2f7-a5b36b94de55",
        "provenance": [
          {
            "name": "OnAnyRequestedSdmGoal",
            "registration": "@atomist/atomist-sdm-03c998ce-10c2-527f-94ee-8bf85246fafd",
            "version": "0.1.2-20180518092517"
          },
          {
            "name": "RequestDownstreamGoalsOnGoalSuccess",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          },
          {
            "name": "SetGoalsOnPush",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          }
        ],
        "environment": "0-code",
        "approval": null
      },
      {
        "description": "Build successful",
        "goalSetId": "b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "autofix"
          }
        ],
        "uniqueName": "Build",
        "name": "build",
        "goalSet": "Deploy",
        "state": "success",
        "ts": 1526659283653,
        "id": "33998523-9f23-54bd-a24b-3ebfa22d1b15",
        "url": "http://rolar.cfapps.io/logs/T29E48P34/atomist/lifecycle-automation/eb2e86fffe1c4686eebd9211aaef47ea814d57bb/0-code/build/b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435/bb380d3c-0ddf-480b-b2f7-a5b36b94de55",
        "provenance": [
          {
            "name": "OnAnyRequestedSdmGoal",
            "registration": "@atomist/atomist-sdm-3849393f-ee26-54de-a622-426e4c7e2995",
            "version": "0.1.2-20180518092517"
          },
          {
            "name": "RequestDownstreamGoalsOnGoalSuccess",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          },
          {
            "name": "SetGoalsOnPush",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          }
        ],
        "environment": "0-code",
        "approval": null
      },
      {
        "description": "Running autofixes...",
        "goalSetId": "b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435",
        "preConditions": [],
        "uniqueName": "Autofix",
        "name": "autofix",
        "goalSet": "Deploy",
        "state": "in_process",
        "ts": 1526659172128,
        "id": "37260c8a-ab3b-5c57-a5d6-d710a307e38a",
        "url": "http://rolar.cfapps.io/logs/T29E48P34/atomist/lifecycle-automation/eb2e86fffe1c4686eebd9211aaef47ea814d57bb/0-code/autofix/b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435/bb380d3c-0ddf-480b-b2f7-a5b36b94de55",
        "provenance": [
          {
            "name": "OnAnyRequestedSdmGoal",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          },
          {
            "name": "SetGoalsOnPush",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          }
        ],
        "environment": "0-code",
        "approval": null
      },
      {
        "description": "Autofixed",
        "goalSetId": "b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435",
        "preConditions": [],
        "uniqueName": "Autofix",
        "name": "autofix",
        "goalSet": "Deploy",
        "state": "success",
        "ts": 1526659196620,
        "id": "31d62f93-504f-5ad2-992c-76e92ce64741",
        "url": "http://rolar.cfapps.io/logs/T29E48P34/atomist/lifecycle-automation/eb2e86fffe1c4686eebd9211aaef47ea814d57bb/0-code/autofix/b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435/bb380d3c-0ddf-480b-b2f7-a5b36b94de55",
        "provenance": [
          {
            "name": "OnAnyRequestedSdmGoal",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          },
          {
            "name": "SetGoalsOnPush",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          }
        ],
        "environment": "0-code",
        "approval": null
      },
      {
        "description": "Planned: create release tag",
        "goalSetId": "b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435",
        "preConditions": [
          {
            "environment": "2-prod",
            "name": "release NPM package"
          },
          {
            "environment": "2-prod",
            "name": "release Docker image"
          }
        ],
        "uniqueName": "ReleaseTag",
        "name": "create release tag",
        "goalSet": "Deploy",
        "state": "planned",
        "ts": 1526659165102,
        "id": "3ddfe8a1-9cfa-5c3a-9a09-7264c08d225e",
        "url": null,
        "provenance": [
          {
            "name": "SetGoalsOnPush",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          }
        ],
        "environment": "2-prod",
        "approval": null
      },
      {
        "description": "Planned: tag",
        "goalSetId": "b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "docker build"
          },
          {
            "environment": "0-code",
            "name": "build"
          }
        ],
        "uniqueName": "Tag",
        "name": "tag",
        "goalSet": "Deploy",
        "state": "planned",
        "ts": 1526659165102,
        "id": "2a976a24-ee45-5e4b-9501-cce1d2fbb5dc",
        "url": null,
        "provenance": [
          {
            "name": "SetGoalsOnPush",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          }
        ],
        "environment": "0-code",
        "approval": null
      },
      {
        "description": "Planned: review",
        "goalSetId": "b3bc5d52-12ad-41d7-b0c6-99f4dbaf2435",
        "preConditions": [],
        "uniqueName": "Review",
        "name": "review",
        "goalSet": "Deploy",
        "state": "requested",
        "ts": 1526659165102,
        "id": "06e9ba2e-82da-50de-ac07-6265226432f1",
        "url": null,
        "provenance": [
          {
            "name": "SetGoalsOnPush",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          }
        ],
        "environment": "0-code",
        "approval": null
      },
      {
        "description": "Deployed to Kubernetes namespace \`production\`",
        "goalSetId": "08cb8b07-2e86-48df-975d-e466df2d61f0",
        "preConditions": [
          {
            "environment": "2-prod",
            "name": "redeploy to Prod"
          }
        ],
        "uniqueName": "ReReDeployToProduction",
        "name": "reredeploy to Prod",
        "goalSet": "Rollback",
        "state": "success",
        "ts": 1526676423981,
        "id": "1e6d44e5-af2a-59a1-9d8e-a1bd7cddd80b",
        "url": null,
        "provenance": [
          {
            "name": "KubeDeploy",
            "registration": "@atomist/k8-automation",
            "version": "0.7.4-20180507023611"
          },
          {
            "name": "KubeDeploy",
            "registration": "@atomist/k8-automation",
            "version": "0.7.4-20180507023611"
          },
          {
            "name": "KubeDeploy",
            "registration": "@atomist/k8-automation",
            "version": "0.7.4-20180507023611"
          },
          {
            "name": "RequestDownstreamGoalsOnGoalSuccess",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          },
          {
            "name": "SetGoalsOnPush",
            "registration": "@atomist/atomist-sdm",
            "version": "0.1.2-20180518092517"
          },
          {
            "name": "RollbackOnSentryAlert",
            "registration": "@atomist/sentry-automation",
            "version": "0.1.0"
          },
          {
            "name": "RollbackDeployment",
            "registration": "@atomist/sentry-automation",
            "version": "0.1.0"
          }
        ],
        "environment": "10-redeploy",
        "approval": null
      }
    ]`;
    /* tslint:enable */

    it("handle many goals", () => {
        const goals = JSON.parse(twoGoalSets);
        sortGoals(_.shuffle(goals));
    });

    it("handle no goals", () => {
        sortGoals(_.shuffle([]));
    });

    /* tslint:disable */
    const cyclicGoals = `[{"externalKey":"sdm/atomist/0-code/fingerprint","description":"Planned: fingerprint","goalSetId":"5e215e39-69ec-4937-af33-a4d91b7f2e1e","preConditions":[],"uniqueName":"fingerprint","name":"fingerprint","goalSet":"Checks, Build, StagingDeployment, ProdDeployment, fingerprint","externalUrl":null,"phase":null,"state":"requested","ts":1537341220914,"fulfillment":{"method":"sdm","name":"FingerprinterRegistration"},"id":"3d29d125-e9a5-5793-aa8b-47dce4e0eb81","url":null,"provenance":[{"correlationId":"9843bfe7-cfa0-4152-baf7-b961b91ccea4","name":"SetGoalsOnPush","registration":"@atomist/sample-sdm","ts":1537341220914,"version":"0.5.1"}],"environment":"0-code","repo":{"name":"zesty","owner":"spring-team"},"branch":"master","retryFeasible":false,"approvalRequired":false,"sha":"c5c2a0120026bd7172b4e38555ce6a1eb3f95d35","approval":null,"data":null},{"externalKey":"sdm/atomist/0-code/Production Deploy","description":"Planned: Production Deploy","goalSetId":"5e215e39-69ec-4937-af33-a4d91b7f2e1e","preConditions":[{"environment":"0-code","name":"store artifact"},{"environment":"1-staging","name":"verify Test deployment"}],"uniqueName":"Production Deploy","name":"Production Deploy","goalSet":"Checks, Build, StagingDeployment, ProdDeployment, fingerprint","externalUrl":null,"phase":null,"state":"planned","ts":1537341220914,"fulfillment":{"method":"sdm","name":"Production Deploy"},"id":"32d8c69e-ffb6-5976-a4f3-66c64a81bd0b","url":null,"provenance":[{"correlationId":"9843bfe7-cfa0-4152-baf7-b961b91ccea4","name":"SetGoalsOnPush","registration":"@atomist/sample-sdm","ts":1537341220914,"version":"0.5.1"}],"environment":"0-code","repo":{"name":"zesty","owner":"spring-team"},"branch":"master","retryFeasible":false,"approvalRequired":false,"sha":"c5c2a0120026bd7172b4e38555ce6a1eb3f95d35","approval":null,"data":null},{"externalKey":"sdm/atomist/1-staging/deploy-to-test","description":"Planned: deploy to Test","goalSetId":"5e215e39-69ec-4937-af33-a4d91b7f2e1e","preConditions":[{"environment":"0-code","name":"store artifact"}],"uniqueName":"deploy-to-test","name":"deploy to Test","goalSet":"Checks, Build, StagingDeployment, ProdDeployment, fingerprint","externalUrl":null,"phase":null,"state":"planned","ts":1537341220914,"fulfillment":{"method":"sdm","name":"Staging local deployer"},"id":"28fd16c0-61db-57eb-a085-98b0be5175ad","url":null,"provenance":[{"correlationId":"9843bfe7-cfa0-4152-baf7-b961b91ccea4","name":"SetGoalsOnPush","registration":"@atomist/sample-sdm","ts":1537341220914,"version":"0.5.1"}],"environment":"1-staging","repo":{"name":"zesty","owner":"spring-team"},"branch":"master","retryFeasible":false,"approvalRequired":false,"sha":"c5c2a0120026bd7172b4e38555ce6a1eb3f95d35","approval":null,"data":null},{"externalKey":"sdm/atomist/0-code/code-inspection#additiveCloudFoundryMachine.ts:119","description":"Planned: code-inspections","goalSetId":"5e215e39-69ec-4937-af33-a4d91b7f2e1e","preConditions":[],"uniqueName":"code-inspection#additiveCloudFoundryMachine.ts:119","name":"code-inspections","goalSet":"Checks, Build, StagingDeployment, ProdDeployment, fingerprint","externalUrl":null,"phase":null,"state":"requested","ts":1537341220914,"fulfillment":{"method":"sdm","name":"code-inspections-code-inspection#additiveCloudFoundryMachine.ts:119"},"id":"02c427a4-d0a3-5186-9ac1-0a60c99682af","url":null,"provenance":[{"correlationId":"9843bfe7-cfa0-4152-baf7-b961b91ccea4","name":"SetGoalsOnPush","registration":"@atomist/sample-sdm","ts":1537341220914,"version":"0.5.1"}],"environment":"0-code","repo":{"name":"zesty","owner":"spring-team"},"branch":"master","retryFeasible":false,"approvalRequired":false,"sha":"c5c2a0120026bd7172b4e38555ce6a1eb3f95d35","approval":null,"data":null},{"externalKey":"sdm/atomist/0-code/push-impact#additiveCloudFoundryMachine.ts:118","description":"Planned: push-impact","goalSetId":"5e215e39-69ec-4937-af33-a4d91b7f2e1e","preConditions":[],"uniqueName":"push-impact#additiveCloudFoundryMachine.ts:118","name":"push-impact","goalSet":"Checks, Build, StagingDeployment, ProdDeployment, fingerprint","externalUrl":null,"phase":null,"state":"requested","ts":1537341220914,"fulfillment":{"method":"sdm","name":"push-impact-push-impact#additiveCloudFoundryMachine.ts:118"},"id":"29dbfa40-842f-5178-ae9e-db71d66c6c72","url":null,"provenance":[{"correlationId":"9843bfe7-cfa0-4152-baf7-b961b91ccea4","name":"SetGoalsOnPush","registration":"@atomist/sample-sdm","ts":1537341220914,"version":"0.5.1"}],"environment":"0-code","repo":{"name":"zesty","owner":"spring-team"},"branch":"master","retryFeasible":false,"approvalRequired":false,"sha":"c5c2a0120026bd7172b4e38555ce6a1eb3f95d35","approval":null,"data":null},{"externalKey":"sdm/atomist/0-code/build#additiveCloudFoundryMachine.ts:125","description":"Planned: build","goalSetId":"5e215e39-69ec-4937-af33-a4d91b7f2e1e","preConditions":[{"environment":"0-code","name":"autofix"}],"uniqueName":"build#additiveCloudFoundryMachine.ts:125","name":"build","goalSet":"Checks, Build, StagingDeployment, ProdDeployment, fingerprint","externalUrl":null,"phase":null,"state":"planned","ts":1537341220914,"fulfillment":{"method":"sdm","name":"Maven"},"id":"35331743-65e4-5f3b-8f73-75c5fb14d703","url":null,"provenance":[{"correlationId":"9843bfe7-cfa0-4152-baf7-b961b91ccea4","name":"SetGoalsOnPush","registration":"@atomist/sample-sdm","ts":1537341220914,"version":"0.5.1"}],"environment":"0-code","repo":{"name":"zesty","owner":"spring-team"},"branch":"master","retryFeasible":true,"approvalRequired":false,"sha":"c5c2a0120026bd7172b4e38555ce6a1eb3f95d35","approval":null,"data":null},{"externalKey":"sdm/atomist/0-code/autofix#additiveCloudFoundryMachine.ts:117","description":"Planned: autofix","goalSetId":"5e215e39-69ec-4937-af33-a4d91b7f2e1e","preConditions":[],"uniqueName":"autofix#additiveCloudFoundryMachine.ts:117","name":"autofix","goalSet":"Checks, Build, StagingDeployment, ProdDeployment, fingerprint","externalUrl":null,"phase":null,"state":"requested","ts":1537341220914,"fulfillment":{"method":"sdm","name":"autofix-autofix#additiveCloudFoundryMachine.ts:117"},"id":"062ee28a-f331-5b1d-a3bf-55f6a79c32fd","url":null,"provenance":[{"correlationId":"9843bfe7-cfa0-4152-baf7-b961b91ccea4","name":"SetGoalsOnPush","registration":"@atomist/sample-sdm","ts":1537341220914,"version":"0.5.1"}],"environment":"0-code","repo":{"name":"zesty","owner":"spring-team"},"branch":"master","retryFeasible":false,"approvalRequired":false,"sha":"c5c2a0120026bd7172b4e38555ce6a1eb3f95d35","approval":null,"data":null},{"externalKey":"sdm/atomist/0-code/artifact","description":"Planned: store artifact","goalSetId":"5e215e39-69ec-4937-af33-a4d91b7f2e1e","preConditions":[{"environment":"0-code","name":"build"}],"uniqueName":"artifact","name":"store artifact","goalSet":"Checks, Build, StagingDeployment, ProdDeployment, fingerprint","externalUrl":null,"phase":null,"state":"planned","ts":1537341220914,"fulfillment":{"method":"side-effect","name":"@atomist/sample-sdm"},"id":"2bf2be98-fadc-5a05-8369-f926fd40ce29","url":null,"provenance":[{"correlationId":"9843bfe7-cfa0-4152-baf7-b961b91ccea4","name":"SetGoalsOnPush","registration":"@atomist/sample-sdm","ts":1537341220914,"version":"0.5.1"}],"environment":"0-code","repo":{"name":"zesty","owner":"spring-team"},"branch":"master","retryFeasible":false,"approvalRequired":false,"sha":"c5c2a0120026bd7172b4e38555ce6a1eb3f95d35","approval":null,"data":null},{"externalKey":"sdm/atomist/1-staging/find-test-endpoint","description":"Planned: locate service endpoint in Test","goalSetId":"5e215e39-69ec-4937-af33-a4d91b7f2e1e","preConditions":[{"environment":"1-staging","name":"deploy to Test"}],"uniqueName":"find-test-endpoint","name":"locate service endpoint in Test","goalSet":"Checks, Build, StagingDeployment, ProdDeployment, fingerprint","externalUrl":null,"phase":null,"state":"planned","ts":1537341220914,"fulfillment":{"method":"side-effect","name":"deploy to Test"},"id":"3103f253-4741-5c32-a5f9-97bd94904dc6","url":null,"provenance":[{"correlationId":"9843bfe7-cfa0-4152-baf7-b961b91ccea4","name":"SetGoalsOnPush","registration":"@atomist/sample-sdm","ts":1537341220914,"version":"0.5.1"}],"environment":"1-staging","repo":{"name":"zesty","owner":"spring-team"},"branch":"master","retryFeasible":false,"approvalRequired":false,"sha":"c5c2a0120026bd7172b4e38555ce6a1eb3f95d35","approval":null,"data":null}]`;
    /* tslint:enable */

    it("handle cyclic goals", () => {
        sortGoals(JSON.parse(cyclicGoals));
    });
});
