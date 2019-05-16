/*
 * Copyright © 2019 Atomist, Inc.
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
import "mocha";
import * as assert from "power-assert";
import { SdmGoalsByCommit } from "../../lib/typings/types";
import { sortGoals } from "../../lib/util/goals";

describe("goals", () => {

    it("should sort goals", () => {
        const goal0: SdmGoalsByCommit.SdmGoal = {
            environment: "code",
            name: "review",
            uniqueName: "review",
            ts: Date.now(),
        };
        const goal1: SdmGoalsByCommit.SdmGoal = {
            environment: "code",
            name: "autofix",
            uniqueName: "autofix",
            ts: Date.now(),
        };
        const goal2: SdmGoalsByCommit.SdmGoal = {
            environment: "code",
            name: "build",
            uniqueName: "build",
            ts: Date.now(),
        };
        const goal3: SdmGoalsByCommit.SdmGoal = {
            environment: "code",
            name: "docker build",
            uniqueName: "docker build",
            preConditions: [{
                environment: "code",
                name: "build",
            }],
            ts: Date.now(),
        };
        const goal4: SdmGoalsByCommit.SdmGoal = {
            environment: "test",
            name: "deployToTest",
            uniqueName: "deployToTest",
            preConditions: [{
                environment: "code",
                name: "build",
            }],
            ts: Date.now(),
        };
        const goal5: SdmGoalsByCommit.SdmGoal = {
            environment: "prod",
            name: "deployToProd",
            uniqueName: "deployToProd",
            preConditions: [{
                environment: "test",
                name: "deployToTest",
            }],
            ts: Date.now(),
        };

        const sortedGoals = sortGoals([goal1, goal0, goal2, goal3, goal4, goal5], []);
        assert.equal(sortedGoals.length, 3);
        assert.equal(sortedGoals[0].environment, "code");
        assert.equal(sortedGoals[1].environment, "test");
        assert.equal(sortedGoals[2].environment, "prod");
        assert.deepEqual(sortedGoals[0].goals, [goal1, goal2, goal0, goal3]);
        assert.deepEqual(sortedGoals[1].goals, [goal4]);
        assert.deepEqual(sortedGoals[2].goals, [goal5]);
    });

    it("should sort goals for only one environment", () => {
        const goal1: SdmGoalsByCommit.SdmGoal = {
            environment: "code",
            name: "build",
            uniqueName: "build",
            ts: Date.now(),
        };
        const goal2: SdmGoalsByCommit.SdmGoal = {
            environment: "code",
            name: "docker build",
            uniqueName: "docker build",
            preConditions: [{
                environment: "code",
                name: "build",
            }],
            ts: Date.now(),
        };

        const sortedGoals = sortGoals(_.shuffle([goal1, goal2]), []);
        assert.equal(sortedGoals.length, 1);
        assert.equal(sortedGoals[0].environment, "code");
        assert.deepEqual(sortedGoals[0].goals, [goal1, goal2]);
    });

    it("should handle cycle properly", () => {
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
            sortGoals(_.shuffle([goal1, goal2]), []);
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

    it("should handle many goals", () => {
        const goals = JSON.parse(twoGoalSets);
        sortGoals(_.shuffle(goals), []);
    });

    it("should handle no goals", () => {
        sortGoals(_.shuffle([]), []);
    });

    /* tslint:disable */
    const cyclicGoals = `[{"externalKey":"sdm/atomist/0-code/fingerprint","description":"Planned: fingerprint","goalSetId":"5e215e39-69ec-4937-af33-a4d91b7f2e1e","preConditions":[],"uniqueName":"fingerprint","name":"fingerprint","goalSet":"Checks, Build, StagingDeployment, ProdDeployment, fingerprint","externalUrl":null,"phase":null,"state":"requested","ts":1537341220914,"fulfillment":{"method":"sdm","name":"FingerprinterRegistration"},"id":"3d29d125-e9a5-5793-aa8b-47dce4e0eb81","url":null,"provenance":[{"correlationId":"9843bfe7-cfa0-4152-baf7-b961b91ccea4","name":"SetGoalsOnPush","registration":"@atomist/sample-sdm","ts":1537341220914,"version":"0.5.1"}],"environment":"0-code","repo":{"name":"zesty","owner":"spring-team"},"branch":"master","retryFeasible":false,"approvalRequired":false,"sha":"c5c2a0120026bd7172b4e38555ce6a1eb3f95d35","approval":null,"data":null},{"externalKey":"sdm/atomist/0-code/Production Deploy","description":"Planned: Production Deploy","goalSetId":"5e215e39-69ec-4937-af33-a4d91b7f2e1e","preConditions":[{"environment":"0-code","name":"store artifact"},{"environment":"1-staging","name":"verify Test deployment"}],"uniqueName":"Production Deploy","name":"Production Deploy","goalSet":"Checks, Build, StagingDeployment, ProdDeployment, fingerprint","externalUrl":null,"phase":null,"state":"planned","ts":1537341220914,"fulfillment":{"method":"sdm","name":"Production Deploy"},"id":"32d8c69e-ffb6-5976-a4f3-66c64a81bd0b","url":null,"provenance":[{"correlationId":"9843bfe7-cfa0-4152-baf7-b961b91ccea4","name":"SetGoalsOnPush","registration":"@atomist/sample-sdm","ts":1537341220914,"version":"0.5.1"}],"environment":"0-code","repo":{"name":"zesty","owner":"spring-team"},"branch":"master","retryFeasible":false,"approvalRequired":false,"sha":"c5c2a0120026bd7172b4e38555ce6a1eb3f95d35","approval":null,"data":null},{"externalKey":"sdm/atomist/1-staging/deploy-to-test","description":"Planned: deploy to Test","goalSetId":"5e215e39-69ec-4937-af33-a4d91b7f2e1e","preConditions":[{"environment":"0-code","name":"store artifact"}],"uniqueName":"deploy-to-test","name":"deploy to Test","goalSet":"Checks, Build, StagingDeployment, ProdDeployment, fingerprint","externalUrl":null,"phase":null,"state":"planned","ts":1537341220914,"fulfillment":{"method":"sdm","name":"Staging local deployer"},"id":"28fd16c0-61db-57eb-a085-98b0be5175ad","url":null,"provenance":[{"correlationId":"9843bfe7-cfa0-4152-baf7-b961b91ccea4","name":"SetGoalsOnPush","registration":"@atomist/sample-sdm","ts":1537341220914,"version":"0.5.1"}],"environment":"1-staging","repo":{"name":"zesty","owner":"spring-team"},"branch":"master","retryFeasible":false,"approvalRequired":false,"sha":"c5c2a0120026bd7172b4e38555ce6a1eb3f95d35","approval":null,"data":null},{"externalKey":"sdm/atomist/0-code/code-inspection#additiveCloudFoundryMachine.ts:119","description":"Planned: code-inspections","goalSetId":"5e215e39-69ec-4937-af33-a4d91b7f2e1e","preConditions":[],"uniqueName":"code-inspection#additiveCloudFoundryMachine.ts:119","name":"code-inspections","goalSet":"Checks, Build, StagingDeployment, ProdDeployment, fingerprint","externalUrl":null,"phase":null,"state":"requested","ts":1537341220914,"fulfillment":{"method":"sdm","name":"code-inspections-code-inspection#additiveCloudFoundryMachine.ts:119"},"id":"02c427a4-d0a3-5186-9ac1-0a60c99682af","url":null,"provenance":[{"correlationId":"9843bfe7-cfa0-4152-baf7-b961b91ccea4","name":"SetGoalsOnPush","registration":"@atomist/sample-sdm","ts":1537341220914,"version":"0.5.1"}],"environment":"0-code","repo":{"name":"zesty","owner":"spring-team"},"branch":"master","retryFeasible":false,"approvalRequired":false,"sha":"c5c2a0120026bd7172b4e38555ce6a1eb3f95d35","approval":null,"data":null},{"externalKey":"sdm/atomist/0-code/push-impact#additiveCloudFoundryMachine.ts:118","description":"Planned: push-impact","goalSetId":"5e215e39-69ec-4937-af33-a4d91b7f2e1e","preConditions":[],"uniqueName":"push-impact#additiveCloudFoundryMachine.ts:118","name":"push-impact","goalSet":"Checks, Build, StagingDeployment, ProdDeployment, fingerprint","externalUrl":null,"phase":null,"state":"requested","ts":1537341220914,"fulfillment":{"method":"sdm","name":"push-impact-push-impact#additiveCloudFoundryMachine.ts:118"},"id":"29dbfa40-842f-5178-ae9e-db71d66c6c72","url":null,"provenance":[{"correlationId":"9843bfe7-cfa0-4152-baf7-b961b91ccea4","name":"SetGoalsOnPush","registration":"@atomist/sample-sdm","ts":1537341220914,"version":"0.5.1"}],"environment":"0-code","repo":{"name":"zesty","owner":"spring-team"},"branch":"master","retryFeasible":false,"approvalRequired":false,"sha":"c5c2a0120026bd7172b4e38555ce6a1eb3f95d35","approval":null,"data":null},{"externalKey":"sdm/atomist/0-code/build#additiveCloudFoundryMachine.ts:125","description":"Planned: build","goalSetId":"5e215e39-69ec-4937-af33-a4d91b7f2e1e","preConditions":[{"environment":"0-code","name":"autofix"}],"uniqueName":"build#additiveCloudFoundryMachine.ts:125","name":"build","goalSet":"Checks, Build, StagingDeployment, ProdDeployment, fingerprint","externalUrl":null,"phase":null,"state":"planned","ts":1537341220914,"fulfillment":{"method":"sdm","name":"Maven"},"id":"35331743-65e4-5f3b-8f73-75c5fb14d703","url":null,"provenance":[{"correlationId":"9843bfe7-cfa0-4152-baf7-b961b91ccea4","name":"SetGoalsOnPush","registration":"@atomist/sample-sdm","ts":1537341220914,"version":"0.5.1"}],"environment":"0-code","repo":{"name":"zesty","owner":"spring-team"},"branch":"master","retryFeasible":true,"approvalRequired":false,"sha":"c5c2a0120026bd7172b4e38555ce6a1eb3f95d35","approval":null,"data":null},{"externalKey":"sdm/atomist/0-code/autofix#additiveCloudFoundryMachine.ts:117","description":"Planned: autofix","goalSetId":"5e215e39-69ec-4937-af33-a4d91b7f2e1e","preConditions":[],"uniqueName":"autofix#additiveCloudFoundryMachine.ts:117","name":"autofix","goalSet":"Checks, Build, StagingDeployment, ProdDeployment, fingerprint","externalUrl":null,"phase":null,"state":"requested","ts":1537341220914,"fulfillment":{"method":"sdm","name":"autofix-autofix#additiveCloudFoundryMachine.ts:117"},"id":"062ee28a-f331-5b1d-a3bf-55f6a79c32fd","url":null,"provenance":[{"correlationId":"9843bfe7-cfa0-4152-baf7-b961b91ccea4","name":"SetGoalsOnPush","registration":"@atomist/sample-sdm","ts":1537341220914,"version":"0.5.1"}],"environment":"0-code","repo":{"name":"zesty","owner":"spring-team"},"branch":"master","retryFeasible":false,"approvalRequired":false,"sha":"c5c2a0120026bd7172b4e38555ce6a1eb3f95d35","approval":null,"data":null},{"externalKey":"sdm/atomist/0-code/artifact","description":"Planned: store artifact","goalSetId":"5e215e39-69ec-4937-af33-a4d91b7f2e1e","preConditions":[{"environment":"0-code","name":"build"}],"uniqueName":"artifact","name":"store artifact","goalSet":"Checks, Build, StagingDeployment, ProdDeployment, fingerprint","externalUrl":null,"phase":null,"state":"planned","ts":1537341220914,"fulfillment":{"method":"side-effect","name":"@atomist/sample-sdm"},"id":"2bf2be98-fadc-5a05-8369-f926fd40ce29","url":null,"provenance":[{"correlationId":"9843bfe7-cfa0-4152-baf7-b961b91ccea4","name":"SetGoalsOnPush","registration":"@atomist/sample-sdm","ts":1537341220914,"version":"0.5.1"}],"environment":"0-code","repo":{"name":"zesty","owner":"spring-team"},"branch":"master","retryFeasible":false,"approvalRequired":false,"sha":"c5c2a0120026bd7172b4e38555ce6a1eb3f95d35","approval":null,"data":null},{"externalKey":"sdm/atomist/1-staging/find-test-endpoint","description":"Planned: locate service endpoint in Test","goalSetId":"5e215e39-69ec-4937-af33-a4d91b7f2e1e","preConditions":[{"environment":"1-staging","name":"deploy to Test"}],"uniqueName":"find-test-endpoint","name":"locate service endpoint in Test","goalSet":"Checks, Build, StagingDeployment, ProdDeployment, fingerprint","externalUrl":null,"phase":null,"state":"planned","ts":1537341220914,"fulfillment":{"method":"side-effect","name":"deploy to Test"},"id":"3103f253-4741-5c32-a5f9-97bd94904dc6","url":null,"provenance":[{"correlationId":"9843bfe7-cfa0-4152-baf7-b961b91ccea4","name":"SetGoalsOnPush","registration":"@atomist/sample-sdm","ts":1537341220914,"version":"0.5.1"}],"environment":"1-staging","repo":{"name":"zesty","owner":"spring-team"},"branch":"master","retryFeasible":false,"approvalRequired":false,"sha":"c5c2a0120026bd7172b4e38555ce6a1eb3f95d35","approval":null,"data":null}]`;
    /* tslint:enable */

    it("handle cyclic goals", () => {
        sortGoals(JSON.parse(cyclicGoals), []);
    });

    const goalsForGoalSetTest = `[
      {
        "description": "Calculating project version",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [],
        "uniqueName": "version#goals.ts:40",
        "name": "version",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539191032422,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Running fingerprint calculations",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [],
        "uniqueName": "fingerprint#goals.ts:45",
        "name": "fingerprint",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539191033048,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Planned: increment version",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [
          {
            "environment": "2-prod",
            "name": "update changelog"
          }
        ],
        "uniqueName": "release-version",
        "name": "increment version",
        "goalSet": "Docker Build with Release",
        "state": "planned",
        "ts": 1539191029725,
        "environment": "2-prod",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Planned: release NPM package",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "publish"
          }
        ],
        "uniqueName": "release-npm",
        "name": "release NPM package",
        "goalSet": "Docker Build with Release",
        "state": "planned",
        "ts": 1539191029724,
        "environment": "2-prod",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Planned: build",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "autofix"
          },
          {
            "environment": "0-code",
            "name": "version"
          }
        ],
        "uniqueName": "build#goals.ts:42",
        "name": "build",
        "goalSet": "Docker Build with Release",
        "state": "planned",
        "ts": 1539191029724,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Planned: publish",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          },
          {
            "environment": "0-code",
            "name": "docker build"
          }
        ],
        "uniqueName": "publish-approval",
        "name": "publish",
        "goalSet": "Docker Build with Release",
        "state": "planned",
        "ts": 1539191029719,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Planned: push-impact",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [],
        "uniqueName": "push-impact#goals.ts:39",
        "name": "push-impact",
        "goalSet": "Docker Build with Release",
        "state": "requested",
        "ts": 1539191029709,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Building",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "autofix"
          },
          {
            "environment": "0-code",
            "name": "version"
          }
        ],
        "uniqueName": "build#goals.ts:42",
        "name": "build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539191121585,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Applying autofixes",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [],
        "uniqueName": "autofix#goals.ts:41",
        "name": "autofix",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539191082942,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Running docker build",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          }
        ],
        "uniqueName": "docker-build#goals.ts:44",
        "name": "docker build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539191154995,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Running docker build",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          }
        ],
        "uniqueName": "docker-build#goals.ts:44",
        "name": "docker build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539191154593,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Ready to docker build",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          }
        ],
        "uniqueName": "docker-build#goals.ts:44",
        "name": "docker build",
        "goalSet": "Docker Build with Release",
        "state": "requested",
        "ts": 1539191142109,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Docker build successful",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          }
        ],
        "uniqueName": "docker-build#goals.ts:44",
        "name": "docker build",
        "goalSet": "Docker Build with Release",
        "state": "success",
        "ts": 1539191214094,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Publishing",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          },
          {
            "environment": "0-code",
            "name": "docker build"
          }
        ],
        "uniqueName": "publish-approval",
        "name": "publish",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539191244464,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Running docker build",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          }
        ],
        "uniqueName": "docker-build#goals.ts:44",
        "name": "docker build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207237435,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Running docker build",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          }
        ],
        "uniqueName": "docker-build#goals.ts:44",
        "name": "docker build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207220470,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Running docker build",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          }
        ],
        "uniqueName": "docker-build#goals.ts:44",
        "name": "docker build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207209524,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Applying autofixes",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [],
        "uniqueName": "autofix#goals.ts:41",
        "name": "autofix",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207152375,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Planned: update changelog",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "publish"
          }
        ],
        "uniqueName": "changelog#goals.ts:50",
        "name": "update changelog",
        "goalSet": "Docker Build with Release",
        "state": "planned",
        "ts": 1539207100014,
        "environment": "2-prod",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Ready: autofix",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [],
        "uniqueName": "autofix#goals.ts:41",
        "name": "autofix",
        "goalSet": "Docker Build with Release",
        "state": "requested",
        "ts": 1539207100014,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Publishing",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          },
          {
            "environment": "0-code",
            "name": "docker build"
          }
        ],
        "uniqueName": "publish-approval",
        "name": "publish",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207283660,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Publishing",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          },
          {
            "environment": "0-code",
            "name": "docker build"
          }
        ],
        "uniqueName": "publish-approval",
        "name": "publish",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207272296,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Planned: build",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "autofix"
          },
          {
            "environment": "0-code",
            "name": "version"
          }
        ],
        "uniqueName": "build#goals.ts:42",
        "name": "build",
        "goalSet": "Docker Build with Release",
        "state": "planned",
        "ts": 1539207481051,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Planned: tag",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "docker build"
          }
        ],
        "uniqueName": "tag#goals.ts:43",
        "name": "tag",
        "goalSet": "Docker Build with Release",
        "state": "planned",
        "ts": 1539207481040,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Ready: autofix",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [],
        "uniqueName": "autofix#goals.ts:41",
        "name": "autofix",
        "goalSet": "Docker Build with Release",
        "state": "requested",
        "ts": 1539207481040,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Running docker build",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          }
        ],
        "uniqueName": "docker-build#goals.ts:44",
        "name": "docker build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207594570,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Running docker build",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          }
        ],
        "uniqueName": "docker-build#goals.ts:44",
        "name": "docker build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207616661,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Running docker build",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          }
        ],
        "uniqueName": "docker-build#goals.ts:44",
        "name": "docker build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207601166,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Running docker build",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          }
        ],
        "uniqueName": "docker-build#goals.ts:44",
        "name": "docker build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207633043,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Building",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "autofix"
          },
          {
            "environment": "0-code",
            "name": "version"
          }
        ],
        "uniqueName": "build#goals.ts:42",
        "name": "build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207568999,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Applying autofixes",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [],
        "uniqueName": "autofix#goals.ts:41",
        "name": "autofix",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207492821,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Planned: release Docker image",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "publish"
          }
        ],
        "uniqueName": "release-docker",
        "name": "release Docker image",
        "goalSet": "Docker Build with Release",
        "state": "planned",
        "ts": 1539207481043,
        "environment": "2-prod",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Planned: release NPM package",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "publish"
          }
        ],
        "uniqueName": "release-npm",
        "name": "release NPM package",
        "goalSet": "Docker Build with Release",
        "state": "planned",
        "ts": 1539207481051,
        "environment": "2-prod",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Ready: tag",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "docker build"
          }
        ],
        "uniqueName": "tag#goals.ts:43",
        "name": "tag",
        "goalSet": "Docker Build with Release",
        "state": "requested",
        "ts": 1539207640085,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Publishing",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          },
          {
            "environment": "0-code",
            "name": "docker build"
          }
        ],
        "uniqueName": "publish-approval",
        "name": "publish",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207666108,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Publishing",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          },
          {
            "environment": "0-code",
            "name": "docker build"
          }
        ],
        "uniqueName": "publish-approval",
        "name": "publish",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207653775,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Running code inspections",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [],
        "uniqueName": "code-inspection#goals.ts:38",
        "name": "code-inspections",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539191032140,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Calculating project version",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [],
        "uniqueName": "version#goals.ts:40",
        "name": "version",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539191032029,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Planned: update changelog",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [
          {
            "environment": "2-prod",
            "name": "publish docs"
          }
        ],
        "uniqueName": "ReleaseChangeLog",
        "name": "update changelog",
        "goalSet": "Docker Build with Release",
        "state": "planned",
        "ts": 1539191029710,
        "environment": "2-prod",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Planned: code-inspections",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [],
        "uniqueName": "code-inspection#goals.ts:38",
        "name": "code-inspections",
        "goalSet": "Docker Build with Release",
        "state": "requested",
        "ts": 1539191029709,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Planned: autofix",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [],
        "uniqueName": "autofix#goals.ts:41",
        "name": "autofix",
        "goalSet": "Docker Build with Release",
        "state": "requested",
        "ts": 1539191029709,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Applying autofixes",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [],
        "uniqueName": "autofix#goals.ts:41",
        "name": "autofix",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539191080314,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "No autofixes applied",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [],
        "uniqueName": "autofix#goals.ts:41",
        "name": "autofix",
        "goalSet": "Docker Build with Release",
        "state": "success",
        "ts": 1539191083043,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Applying autofixes",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [],
        "uniqueName": "autofix#goals.ts:41",
        "name": "autofix",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539191075090,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Fingerprinted",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [],
        "uniqueName": "fingerprint#goals.ts:45",
        "name": "fingerprint",
        "goalSet": "Docker Build with Release",
        "state": "success",
        "ts": 1539191033342,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Ready to build",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "autofix"
          },
          {
            "environment": "0-code",
            "name": "version"
          }
        ],
        "uniqueName": "build#goals.ts:42",
        "name": "build",
        "goalSet": "Docker Build with Release",
        "state": "requested",
        "ts": 1539191085950,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Running docker build",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          }
        ],
        "uniqueName": "docker-build#goals.ts:44",
        "name": "docker build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539191159585,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Running docker build",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          }
        ],
        "uniqueName": "docker-build#goals.ts:44",
        "name": "docker build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539191158950,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Running docker build",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          }
        ],
        "uniqueName": "docker-build#goals.ts:44",
        "name": "docker build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539191168637,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Building",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "autofix"
          },
          {
            "environment": "0-code",
            "name": "version"
          }
        ],
        "uniqueName": "build#goals.ts:42",
        "name": "build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539191139243,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Building",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "autofix"
          },
          {
            "environment": "0-code",
            "name": "version"
          }
        ],
        "uniqueName": "build#goals.ts:42",
        "name": "build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539191101937,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Running docker build",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          }
        ],
        "uniqueName": "docker-build#goals.ts:44",
        "name": "docker build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539191213986,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Tagged",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "docker build"
          }
        ],
        "uniqueName": "tag#goals.ts:43",
        "name": "tag",
        "goalSet": "Docker Build with Release",
        "state": "success",
        "ts": 1539191221329,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Ready to publish",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          },
          {
            "environment": "0-code",
            "name": "docker build"
          }
        ],
        "uniqueName": "publish-approval",
        "name": "publish",
        "goalSet": "Docker Build with Release",
        "state": "requested",
        "ts": 1539191217608,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Approval required: Published",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          },
          {
            "environment": "0-code",
            "name": "docker build"
          }
        ],
        "uniqueName": "publish-approval",
        "name": "publish",
        "goalSet": "Docker Build with Release",
        "state": "waiting_for_approval",
        "ts": 1539191244572,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Publishing",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          },
          {
            "environment": "0-code",
            "name": "docker build"
          }
        ],
        "uniqueName": "publish-approval",
        "name": "publish",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539191231739,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Publishing",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          },
          {
            "environment": "0-code",
            "name": "docker build"
          }
        ],
        "uniqueName": "publish-approval",
        "name": "publish",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539191228883,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Build successful",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "autofix"
          },
          {
            "environment": "0-code",
            "name": "version"
          }
        ],
        "uniqueName": "build#goals.ts:42",
        "name": "build",
        "goalSet": "Docker Build with Release",
        "state": "success",
        "ts": 1539207195552,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Applying autofixes",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [],
        "uniqueName": "autofix#goals.ts:41",
        "name": "autofix",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207140190,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Calculating project version",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [],
        "uniqueName": "version#goals.ts:40",
        "name": "version",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207103089,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Calculating project version",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [],
        "uniqueName": "version#goals.ts:40",
        "name": "version",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207102052,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "No code inspections configured",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [],
        "uniqueName": "code-inspection#goals.ts:38",
        "name": "code-inspections",
        "goalSet": "Docker Build with Release",
        "state": "success",
        "ts": 1539207104469,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Running fingerprint calculations",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [],
        "uniqueName": "fingerprint#goals.ts:45",
        "name": "fingerprint",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207102218,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Applying autofixes",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [],
        "uniqueName": "autofix#goals.ts:41",
        "name": "autofix",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207112404,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Fingerprinted",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [],
        "uniqueName": "fingerprint#goals.ts:45",
        "name": "fingerprint",
        "goalSet": "Docker Build with Release",
        "state": "success",
        "ts": 1539207103449,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Planned: docker build",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          }
        ],
        "uniqueName": "docker-build#goals.ts:44",
        "name": "docker build",
        "goalSet": "Docker Build with Release",
        "state": "planned",
        "ts": 1539207100028,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Approval required: Published",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          },
          {
            "environment": "0-code",
            "name": "docker build"
          }
        ],
        "uniqueName": "publish-approval",
        "name": "publish",
        "goalSet": "Docker Build with Release",
        "state": "waiting_for_approval",
        "ts": 1539207283771,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Running docker build",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          }
        ],
        "uniqueName": "docker-build#goals.ts:44",
        "name": "docker build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207253472,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Running docker build",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          }
        ],
        "uniqueName": "docker-build#goals.ts:44",
        "name": "docker build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207213548,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Publishing",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          },
          {
            "environment": "0-code",
            "name": "docker build"
          }
        ],
        "uniqueName": "publish-approval",
        "name": "publish",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207283666,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Publishing",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          },
          {
            "environment": "0-code",
            "name": "docker build"
          }
        ],
        "uniqueName": "publish-approval",
        "name": "publish",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207283677,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Tagged",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "docker build"
          }
        ],
        "uniqueName": "tag#goals.ts:43",
        "name": "tag",
        "goalSet": "Docker Build with Release",
        "state": "success",
        "ts": 1539207260699,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Applying autofixes",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [],
        "uniqueName": "autofix#goals.ts:41",
        "name": "autofix",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207525357,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Versioned \`1.0.0-master.20181010213804\`",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [],
        "uniqueName": "version#goals.ts:40",
        "name": "version",
        "goalSet": "Docker Build with Release",
        "state": "success",
        "ts": 1539207484607,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Calculating project version",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [],
        "uniqueName": "version#goals.ts:40",
        "name": "version",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207482560,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "No code inspections configured",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [],
        "uniqueName": "code-inspection#goals.ts:38",
        "name": "code-inspections",
        "goalSet": "Docker Build with Release",
        "state": "success",
        "ts": 1539207483091,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Fingerprinted",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [],
        "uniqueName": "fingerprint#goals.ts:45",
        "name": "fingerprint",
        "goalSet": "Docker Build with Release",
        "state": "success",
        "ts": 1539207482834,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Calculating project version",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [],
        "uniqueName": "version#goals.ts:40",
        "name": "version",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207482558,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Running docker build",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          }
        ],
        "uniqueName": "docker-build#goals.ts:44",
        "name": "docker build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207633032,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Running docker build",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          }
        ],
        "uniqueName": "docker-build#goals.ts:44",
        "name": "docker build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207591509,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Running docker build",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          }
        ],
        "uniqueName": "docker-build#goals.ts:44",
        "name": "docker build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207633036,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Publishing",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          },
          {
            "environment": "0-code",
            "name": "docker build"
          }
        ],
        "uniqueName": "publish-approval",
        "name": "publish",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207666114,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Publishing",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          },
          {
            "environment": "0-code",
            "name": "docker build"
          }
        ],
        "uniqueName": "publish-approval",
        "name": "publish",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207666126,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Publishing",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          },
          {
            "environment": "0-code",
            "name": "docker build"
          }
        ],
        "uniqueName": "publish-approval",
        "name": "publish",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207651051,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Building",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "autofix"
          },
          {
            "environment": "0-code",
            "name": "version"
          }
        ],
        "uniqueName": "build#goals.ts:42",
        "name": "build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207547235,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Applying autofixes",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [],
        "uniqueName": "autofix#goals.ts:41",
        "name": "autofix",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207530655,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Ready: docker build",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          }
        ],
        "uniqueName": "docker-build#goals.ts:44",
        "name": "docker build",
        "goalSet": "Docker Build with Release",
        "state": "requested",
        "ts": 1539207578461,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Building",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "autofix"
          },
          {
            "environment": "0-code",
            "name": "version"
          }
        ],
        "uniqueName": "build#goals.ts:42",
        "name": "build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539191098669,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Planned: release Docker image",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "publish"
          }
        ],
        "uniqueName": "release-docker",
        "name": "release Docker image",
        "goalSet": "Docker Build with Release",
        "state": "planned",
        "ts": 1539191029715,
        "environment": "2-prod",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Planned: tag",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "docker build"
          }
        ],
        "uniqueName": "tag#goals.ts:43",
        "name": "tag",
        "goalSet": "Docker Build with Release",
        "state": "planned",
        "ts": 1539191029710,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Build successful",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "autofix"
          },
          {
            "environment": "0-code",
            "name": "version"
          }
        ],
        "uniqueName": "build#goals.ts:42",
        "name": "build",
        "goalSet": "Docker Build with Release",
        "state": "success",
        "ts": 1539191139361,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Building",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "autofix"
          },
          {
            "environment": "0-code",
            "name": "version"
          }
        ],
        "uniqueName": "build#goals.ts:42",
        "name": "build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539191128275,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Running docker build",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          }
        ],
        "uniqueName": "docker-build#goals.ts:44",
        "name": "docker build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539191196869,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Publishing",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          },
          {
            "environment": "0-code",
            "name": "docker build"
          }
        ],
        "uniqueName": "publish-approval",
        "name": "publish",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539191232381,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Publishing",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          },
          {
            "environment": "0-code",
            "name": "docker build"
          }
        ],
        "uniqueName": "publish-approval",
        "name": "publish",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539191229370,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Publishing",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          },
          {
            "environment": "0-code",
            "name": "docker build"
          }
        ],
        "uniqueName": "publish-approval",
        "name": "publish",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539191228455,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Ready: version",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [],
        "uniqueName": "version#goals.ts:40",
        "name": "version",
        "goalSet": "Docker Build with Release",
        "state": "requested",
        "ts": 1539207100027,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Building",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "autofix"
          },
          {
            "environment": "0-code",
            "name": "version"
          }
        ],
        "uniqueName": "build#goals.ts:42",
        "name": "build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207165565,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Building",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "autofix"
          },
          {
            "environment": "0-code",
            "name": "version"
          }
        ],
        "uniqueName": "build#goals.ts:42",
        "name": "build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207195423,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Building",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "autofix"
          },
          {
            "environment": "0-code",
            "name": "version"
          }
        ],
        "uniqueName": "build#goals.ts:42",
        "name": "build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207188125,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Building",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "autofix"
          },
          {
            "environment": "0-code",
            "name": "version"
          }
        ],
        "uniqueName": "build#goals.ts:42",
        "name": "build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207183696,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Building",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "autofix"
          },
          {
            "environment": "0-code",
            "name": "version"
          }
        ],
        "uniqueName": "build#goals.ts:42",
        "name": "build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207164687,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Applying autofixes",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [],
        "uniqueName": "autofix#goals.ts:41",
        "name": "autofix",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207140285,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Completed push impact analysis",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [],
        "uniqueName": "push-impact#goals.ts:39",
        "name": "push-impact",
        "goalSet": "Docker Build with Release",
        "state": "success",
        "ts": 1539207102992,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Ready: docker build",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          }
        ],
        "uniqueName": "docker-build#goals.ts:44",
        "name": "docker build",
        "goalSet": "Docker Build with Release",
        "state": "requested",
        "ts": 1539207199065,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Ready: build",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "autofix"
          },
          {
            "environment": "0-code",
            "name": "version"
          }
        ],
        "uniqueName": "build#goals.ts:42",
        "name": "build",
        "goalSet": "Docker Build with Release",
        "state": "requested",
        "ts": 1539207154104,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Running docker build",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          }
        ],
        "uniqueName": "docker-build#goals.ts:44",
        "name": "docker build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207212983,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Running docker build",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          }
        ],
        "uniqueName": "docker-build#goals.ts:44",
        "name": "docker build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207209981,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Ready: publish",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          },
          {
            "environment": "0-code",
            "name": "docker build"
          }
        ],
        "uniqueName": "publish-approval",
        "name": "publish",
        "goalSet": "Docker Build with Release",
        "state": "requested",
        "ts": 1539207257908,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Calculating project version",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [],
        "uniqueName": "version#goals.ts:40",
        "name": "version",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207484479,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Running code inspections",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [],
        "uniqueName": "code-inspection#goals.ts:38",
        "name": "code-inspections",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207482827,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Planned: increment version",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "publish"
          }
        ],
        "uniqueName": "release-version",
        "name": "increment version",
        "goalSet": "Docker Build with Release",
        "state": "planned",
        "ts": 1539207481051,
        "environment": "2-prod",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Planned: publish",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          },
          {
            "environment": "0-code",
            "name": "docker build"
          }
        ],
        "uniqueName": "publish-approval",
        "name": "publish",
        "goalSet": "Docker Build with Release",
        "state": "planned",
        "ts": 1539207481047,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Planned: publish docs",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "publish"
          }
        ],
        "uniqueName": "release-docs",
        "name": "publish docs",
        "goalSet": "Docker Build with Release",
        "state": "planned",
        "ts": 1539207481051,
        "environment": "2-prod",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Building",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "autofix"
          },
          {
            "environment": "0-code",
            "name": "version"
          }
        ],
        "uniqueName": "build#goals.ts:42",
        "name": "build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207576100,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Publishing",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          },
          {
            "environment": "0-code",
            "name": "docker build"
          }
        ],
        "uniqueName": "publish-approval",
        "name": "publish",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207650673,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Building",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "autofix"
          },
          {
            "environment": "0-code",
            "name": "version"
          }
        ],
        "uniqueName": "build#goals.ts:42",
        "name": "build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207546312,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Tagging",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "docker build"
          }
        ],
        "uniqueName": "tag#goals.ts:43",
        "name": "tag",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207641150,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Applying autofixes",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [],
        "uniqueName": "autofix#goals.ts:41",
        "name": "autofix",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207525091,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Ready: publish",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          },
          {
            "environment": "0-code",
            "name": "docker build"
          }
        ],
        "uniqueName": "publish-approval",
        "name": "publish",
        "goalSet": "Docker Build with Release",
        "state": "requested",
        "ts": 1539207640085,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Versioned \`1.0.0-master.20181010170352\`",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [],
        "uniqueName": "version#goals.ts:40",
        "name": "version",
        "goalSet": "Docker Build with Release",
        "state": "success",
        "ts": 1539191033356,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Planned: docker build",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          }
        ],
        "uniqueName": "docker-build#goals.ts:44",
        "name": "docker build",
        "goalSet": "Docker Build with Release",
        "state": "planned",
        "ts": 1539191029724,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Planned: publish docs",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "publish"
          }
        ],
        "uniqueName": "release-docs",
        "name": "publish docs",
        "goalSet": "Docker Build with Release",
        "state": "planned",
        "ts": 1539191029724,
        "environment": "2-prod",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Building",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "autofix"
          },
          {
            "environment": "0-code",
            "name": "version"
          }
        ],
        "uniqueName": "build#goals.ts:42",
        "name": "build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539191098110,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Applying autofixes",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [],
        "uniqueName": "autofix#goals.ts:41",
        "name": "autofix",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539191079822,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Applying autofixes",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [],
        "uniqueName": "autofix#goals.ts:41",
        "name": "autofix",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539191080006,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Applying autofixes",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [],
        "uniqueName": "autofix#goals.ts:41",
        "name": "autofix",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539191047803,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Applying autofixes",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [],
        "uniqueName": "autofix#goals.ts:41",
        "name": "autofix",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539191075176,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Calculating project version",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [],
        "uniqueName": "version#goals.ts:40",
        "name": "version",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539191033286,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "No code inspections configured",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [],
        "uniqueName": "code-inspection#goals.ts:38",
        "name": "code-inspections",
        "goalSet": "Docker Build with Release",
        "state": "success",
        "ts": 1539191032987,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Code reactions passed",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [],
        "uniqueName": "push-impact#goals.ts:39",
        "name": "push-impact",
        "goalSet": "Docker Build with Release",
        "state": "success",
        "ts": 1539191033997,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Applying autofixes",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [],
        "uniqueName": "autofix#goals.ts:41",
        "name": "autofix",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539191045547,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Running docker build",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          }
        ],
        "uniqueName": "docker-build#goals.ts:44",
        "name": "docker build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539191155658,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Building",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "autofix"
          },
          {
            "environment": "0-code",
            "name": "version"
          }
        ],
        "uniqueName": "build#goals.ts:42",
        "name": "build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539191137795,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Running docker build",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          }
        ],
        "uniqueName": "docker-build#goals.ts:44",
        "name": "docker build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539191213980,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Running docker build",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          }
        ],
        "uniqueName": "docker-build#goals.ts:44",
        "name": "docker build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539191213971,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Running docker build",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          }
        ],
        "uniqueName": "docker-build#goals.ts:44",
        "name": "docker build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539191213974,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Publishing",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          },
          {
            "environment": "0-code",
            "name": "docker build"
          }
        ],
        "uniqueName": "publish-approval",
        "name": "publish",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539191232778,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Tagging",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "docker build"
          }
        ],
        "uniqueName": "tag#goals.ts:43",
        "name": "tag",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539191219169,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Planned: release NPM package",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "publish"
          }
        ],
        "uniqueName": "release-npm",
        "name": "release NPM package",
        "goalSet": "Docker Build with Release",
        "state": "planned",
        "ts": 1539207100028,
        "environment": "2-prod",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Applying autofixes",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [],
        "uniqueName": "autofix#goals.ts:41",
        "name": "autofix",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207113228,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Versioned \`1.0.0-master.20181010213142\`",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [],
        "uniqueName": "version#goals.ts:40",
        "name": "version",
        "goalSet": "Docker Build with Release",
        "state": "success",
        "ts": 1539207103187,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Running push impact analysis",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [],
        "uniqueName": "push-impact#goals.ts:39",
        "name": "push-impact",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207101483,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Planned: create release tag",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
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
        "uniqueName": "release-tag",
        "name": "create release tag",
        "goalSet": "Docker Build with Release",
        "state": "planned",
        "ts": 1539207100015,
        "environment": "2-prod",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Planned: build",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "autofix"
          },
          {
            "environment": "0-code",
            "name": "version"
          }
        ],
        "uniqueName": "build#goals.ts:42",
        "name": "build",
        "goalSet": "Docker Build with Release",
        "state": "planned",
        "ts": 1539207100028,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Planned: publish docs",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "publish"
          }
        ],
        "uniqueName": "release-docs",
        "name": "publish docs",
        "goalSet": "Docker Build with Release",
        "state": "planned",
        "ts": 1539207100028,
        "environment": "2-prod",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Ready: code-inspections",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [],
        "uniqueName": "code-inspection#goals.ts:38",
        "name": "code-inspections",
        "goalSet": "Docker Build with Release",
        "state": "requested",
        "ts": 1539207100014,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Ready: fingerprint",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [],
        "uniqueName": "fingerprint#goals.ts:45",
        "name": "fingerprint",
        "goalSet": "Docker Build with Release",
        "state": "requested",
        "ts": 1539207100014,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Ready: push-impact",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [],
        "uniqueName": "push-impact#goals.ts:39",
        "name": "push-impact",
        "goalSet": "Docker Build with Release",
        "state": "requested",
        "ts": 1539207100014,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Building",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "autofix"
          },
          {
            "environment": "0-code",
            "name": "version"
          }
        ],
        "uniqueName": "build#goals.ts:42",
        "name": "build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207174664,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Applying autofixes",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [],
        "uniqueName": "autofix#goals.ts:41",
        "name": "autofix",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207150020,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Applying autofixes",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [],
        "uniqueName": "autofix#goals.ts:41",
        "name": "autofix",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207144535,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Running docker build",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          }
        ],
        "uniqueName": "docker-build#goals.ts:44",
        "name": "docker build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207253477,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Docker build successful",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          }
        ],
        "uniqueName": "docker-build#goals.ts:44",
        "name": "docker build",
        "goalSet": "Docker Build with Release",
        "state": "success",
        "ts": 1539207253553,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Publishing",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          },
          {
            "environment": "0-code",
            "name": "docker build"
          }
        ],
        "uniqueName": "publish-approval",
        "name": "publish",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207283670,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Publishing",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          },
          {
            "environment": "0-code",
            "name": "docker build"
          }
        ],
        "uniqueName": "publish-approval",
        "name": "publish",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207269419,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Publishing",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          },
          {
            "environment": "0-code",
            "name": "docker build"
          }
        ],
        "uniqueName": "publish-approval",
        "name": "publish",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207268255,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Ready: tag",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "docker build"
          }
        ],
        "uniqueName": "tag#goals.ts:43",
        "name": "tag",
        "goalSet": "Docker Build with Release",
        "state": "requested",
        "ts": 1539207257908,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Planned: update changelog",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "publish"
          }
        ],
        "uniqueName": "changelog#goals.ts:50",
        "name": "update changelog",
        "goalSet": "Docker Build with Release",
        "state": "planned",
        "ts": 1539207481040,
        "environment": "2-prod",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Planned: create release tag",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
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
        "uniqueName": "release-tag",
        "name": "create release tag",
        "goalSet": "Docker Build with Release",
        "state": "planned",
        "ts": 1539207481040,
        "environment": "2-prod",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Ready: code-inspections",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [],
        "uniqueName": "code-inspection#goals.ts:38",
        "name": "code-inspections",
        "goalSet": "Docker Build with Release",
        "state": "requested",
        "ts": 1539207481040,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Ready: fingerprint",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [],
        "uniqueName": "fingerprint#goals.ts:45",
        "name": "fingerprint",
        "goalSet": "Docker Build with Release",
        "state": "requested",
        "ts": 1539207481040,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Ready: push-impact",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [],
        "uniqueName": "push-impact#goals.ts:39",
        "name": "push-impact",
        "goalSet": "Docker Build with Release",
        "state": "requested",
        "ts": 1539207481040,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "No autofixes applied",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [],
        "uniqueName": "autofix#goals.ts:41",
        "name": "autofix",
        "goalSet": "Docker Build with Release",
        "state": "success",
        "ts": 1539207533639,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Applying autofixes",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [],
        "uniqueName": "autofix#goals.ts:41",
        "name": "autofix",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207525170,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Applying autofixes",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [],
        "uniqueName": "autofix#goals.ts:41",
        "name": "autofix",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207533505,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Applying autofixes",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [],
        "uniqueName": "autofix#goals.ts:41",
        "name": "autofix",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207519953,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Running fingerprint calculations",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [],
        "uniqueName": "fingerprint#goals.ts:45",
        "name": "fingerprint",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207482406,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Completed push impact analysis",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [],
        "uniqueName": "push-impact#goals.ts:39",
        "name": "push-impact",
        "goalSet": "Docker Build with Release",
        "state": "success",
        "ts": 1539207486731,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Applying autofixes",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [],
        "uniqueName": "autofix#goals.ts:41",
        "name": "autofix",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207491887,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Planned: docker build",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          }
        ],
        "uniqueName": "docker-build#goals.ts:44",
        "name": "docker build",
        "goalSet": "Docker Build with Release",
        "state": "planned",
        "ts": 1539207481051,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Ready: build",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "autofix"
          },
          {
            "environment": "0-code",
            "name": "version"
          }
        ],
        "uniqueName": "build#goals.ts:42",
        "name": "build",
        "goalSet": "Docker Build with Release",
        "state": "requested",
        "ts": 1539207535723,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Docker build successful",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          }
        ],
        "uniqueName": "docker-build#goals.ts:44",
        "name": "docker build",
        "goalSet": "Docker Build with Release",
        "state": "success",
        "ts": 1539207633117,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Running docker build",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          }
        ],
        "uniqueName": "docker-build#goals.ts:44",
        "name": "docker build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207594813,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Publishing",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          },
          {
            "environment": "0-code",
            "name": "docker build"
          }
        ],
        "uniqueName": "publish-approval",
        "name": "publish",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207651512,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Publishing",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          },
          {
            "environment": "0-code",
            "name": "docker build"
          }
        ],
        "uniqueName": "publish-approval",
        "name": "publish",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207654320,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Build successful",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "autofix"
          },
          {
            "environment": "0-code",
            "name": "version"
          }
        ],
        "uniqueName": "build#goals.ts:42",
        "name": "build",
        "goalSet": "Docker Build with Release",
        "state": "success",
        "ts": 1539207576248,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Building",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "autofix"
          },
          {
            "environment": "0-code",
            "name": "version"
          }
        ],
        "uniqueName": "build#goals.ts:42",
        "name": "build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207575018,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Building",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "autofix"
          },
          {
            "environment": "0-code",
            "name": "version"
          }
        ],
        "uniqueName": "build#goals.ts:42",
        "name": "build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207564941,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Building",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "autofix"
          },
          {
            "environment": "0-code",
            "name": "version"
          }
        ],
        "uniqueName": "build#goals.ts:42",
        "name": "build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207550172,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Tagged",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "docker build"
          }
        ],
        "uniqueName": "tag#goals.ts:43",
        "name": "tag",
        "goalSet": "Docker Build with Release",
        "state": "success",
        "ts": 1539207642383,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Approval required: Published",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          },
          {
            "environment": "0-code",
            "name": "docker build"
          }
        ],
        "uniqueName": "publish-approval",
        "name": "publish",
        "goalSet": "Docker Build with Release",
        "state": "waiting_for_approval",
        "ts": 1539207666242,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Publishing",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          },
          {
            "environment": "0-code",
            "name": "docker build"
          }
        ],
        "uniqueName": "publish-approval",
        "name": "publish",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207666119,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Publishing",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          },
          {
            "environment": "0-code",
            "name": "docker build"
          }
        ],
        "uniqueName": "publish-approval",
        "name": "publish",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207654561,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Planned: fingerprint",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [],
        "uniqueName": "fingerprint#goals.ts:45",
        "name": "fingerprint",
        "goalSet": "Docker Build with Release",
        "state": "requested",
        "ts": 1539191029709,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Planned: version",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [],
        "uniqueName": "version#goals.ts:40",
        "name": "version",
        "goalSet": "Docker Build with Release",
        "state": "requested",
        "ts": 1539191029723,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Building",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "autofix"
          },
          {
            "environment": "0-code",
            "name": "version"
          }
        ],
        "uniqueName": "build#goals.ts:42",
        "name": "build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539191097628,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Running code reactions",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [],
        "uniqueName": "push-impact#goals.ts:39",
        "name": "push-impact",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539191033839,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Planned: create release tag",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
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
        "uniqueName": "release-tag",
        "name": "create release tag",
        "goalSet": "Docker Build with Release",
        "state": "planned",
        "ts": 1539191029710,
        "environment": "2-prod",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Running docker build",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          }
        ],
        "uniqueName": "docker-build#goals.ts:44",
        "name": "docker build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539191159928,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Building",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "autofix"
          },
          {
            "environment": "0-code",
            "name": "version"
          }
        ],
        "uniqueName": "build#goals.ts:42",
        "name": "build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539191108996,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Publishing",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          },
          {
            "environment": "0-code",
            "name": "docker build"
          }
        ],
        "uniqueName": "publish-approval",
        "name": "publish",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539191244468,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Publishing",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          },
          {
            "environment": "0-code",
            "name": "docker build"
          }
        ],
        "uniqueName": "publish-approval",
        "name": "publish",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539191244459,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Publishing",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          },
          {
            "environment": "0-code",
            "name": "docker build"
          }
        ],
        "uniqueName": "publish-approval",
        "name": "publish",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539191244476,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Ready to tag",
        "goalSetId": "671811fb-8080-47f6-9f8c-e4cd139b3feb",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "docker build"
          }
        ],
        "uniqueName": "tag#goals.ts:43",
        "name": "tag",
        "goalSet": "Docker Build with Release",
        "state": "requested",
        "ts": 1539191217608,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Planned: release Docker image",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "publish"
          }
        ],
        "uniqueName": "release-docker",
        "name": "release Docker image",
        "goalSet": "Docker Build with Release",
        "state": "planned",
        "ts": 1539207100019,
        "environment": "2-prod",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Building",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "autofix"
          },
          {
            "environment": "0-code",
            "name": "version"
          }
        ],
        "uniqueName": "build#goals.ts:42",
        "name": "build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207165063,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "No autofixes applied",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [],
        "uniqueName": "autofix#goals.ts:41",
        "name": "autofix",
        "goalSet": "Docker Build with Release",
        "state": "success",
        "ts": 1539207152479,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Applying autofixes",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [],
        "uniqueName": "autofix#goals.ts:41",
        "name": "autofix",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207144421,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Applying autofixes",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [],
        "uniqueName": "autofix#goals.ts:41",
        "name": "autofix",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207144760,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Running code inspections",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [],
        "uniqueName": "code-inspection#goals.ts:38",
        "name": "code-inspections",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207104277,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Calculating project version",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [],
        "uniqueName": "version#goals.ts:40",
        "name": "version",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207101672,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Planned: increment version",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "publish"
          }
        ],
        "uniqueName": "release-version",
        "name": "increment version",
        "goalSet": "Docker Build with Release",
        "state": "planned",
        "ts": 1539207100028,
        "environment": "2-prod",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Planned: publish",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          },
          {
            "environment": "0-code",
            "name": "docker build"
          }
        ],
        "uniqueName": "publish-approval",
        "name": "publish",
        "goalSet": "Docker Build with Release",
        "state": "planned",
        "ts": 1539207100023,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Planned: tag",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "docker build"
          }
        ],
        "uniqueName": "tag#goals.ts:43",
        "name": "tag",
        "goalSet": "Docker Build with Release",
        "state": "planned",
        "ts": 1539207100014,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Running docker build",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          }
        ],
        "uniqueName": "docker-build#goals.ts:44",
        "name": "docker build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207210508,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Running docker build",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          }
        ],
        "uniqueName": "docker-build#goals.ts:44",
        "name": "docker build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207253466,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Running docker build",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          }
        ],
        "uniqueName": "docker-build#goals.ts:44",
        "name": "docker build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207253469,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Running docker build",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          }
        ],
        "uniqueName": "docker-build#goals.ts:44",
        "name": "docker build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207213818,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Building",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "autofix"
          },
          {
            "environment": "0-code",
            "name": "version"
          }
        ],
        "uniqueName": "build#goals.ts:42",
        "name": "build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207194348,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Building",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "autofix"
          },
          {
            "environment": "0-code",
            "name": "version"
          }
        ],
        "uniqueName": "build#goals.ts:42",
        "name": "build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207168707,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Publishing",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          },
          {
            "environment": "0-code",
            "name": "docker build"
          }
        ],
        "uniqueName": "publish-approval",
        "name": "publish",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207271709,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Publishing",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          },
          {
            "environment": "0-code",
            "name": "docker build"
          }
        ],
        "uniqueName": "publish-approval",
        "name": "publish",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207268955,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Publishing",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          },
          {
            "environment": "0-code",
            "name": "docker build"
          }
        ],
        "uniqueName": "publish-approval",
        "name": "publish",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207272557,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Tagging",
        "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "docker build"
          }
        ],
        "uniqueName": "tag#goals.ts:43",
        "name": "tag",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207259082,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Running docker build",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          }
        ],
        "uniqueName": "docker-build#goals.ts:44",
        "name": "docker build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207591064,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Building",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "autofix"
          },
          {
            "environment": "0-code",
            "name": "version"
          }
        ],
        "uniqueName": "build#goals.ts:42",
        "name": "build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207546788,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Building",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "autofix"
          },
          {
            "environment": "0-code",
            "name": "version"
          }
        ],
        "uniqueName": "build#goals.ts:42",
        "name": "build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207556507,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Running docker build",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          }
        ],
        "uniqueName": "docker-build#goals.ts:44",
        "name": "docker build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207590654,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Applying autofixes",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [],
        "uniqueName": "autofix#goals.ts:41",
        "name": "autofix",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207519866,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Running push impact analysis",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [],
        "uniqueName": "push-impact#goals.ts:39",
        "name": "push-impact",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207486514,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Ready: version",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [],
        "uniqueName": "version#goals.ts:40",
        "name": "version",
        "goalSet": "Docker Build with Release",
        "state": "requested",
        "ts": 1539207481051,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Running docker build",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          }
        ],
        "uniqueName": "docker-build#goals.ts:44",
        "name": "docker build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207633039,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      },
      {
        "description": "Running docker build",
        "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
        "preConditions": [
          {
            "environment": "0-code",
            "name": "build"
          }
        ],
        "uniqueName": "docker-build#goals.ts:44",
        "name": "docker build",
        "goalSet": "Docker Build with Release",
        "state": "in_process",
        "ts": 1539207594034,
        "environment": "0-code",
        "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
      }
    ]`;
    const goalSetForGoalSetTest = `[{
    "goalSetId": "b69d3955-4c1d-4703-b826-9a2880801ef6",
    "goals": [{
        "uniqueName": "version#goals.ts:40"
      },
      {
        "uniqueName": "code-inspection#goals.ts:38"
      },
      {
        "uniqueName": "autofix#goals.ts:41"
      },
      {
        "uniqueName": "push-impact#goals.ts:39"
      },
      {
        "uniqueName": "fingerprint#goals.ts:45"
      },
      {
        "uniqueName": "build#goals.ts:42"
      },
      {
        "uniqueName": "docker-build#goals.ts:44"
      },
      {
        "uniqueName": "tag#goals.ts:43"
      },
      {
        "uniqueName": "publish-approval"
      },
      {
        "uniqueName": "release-npm"
      },
      {
        "uniqueName": "release-docker"
      },
      {
        "uniqueName": "release-docs"
      },
      {
        "uniqueName": "changelog#goals.ts:50"
      },
      {
        "uniqueName": "release-version"
      },
      {
        "uniqueName": "release-tag"
      }
    ],
    "goalSet": "Docker Build with Release",
    "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
  },
  {
    "goalSetId": "f198af70-7d65-4a30-94ce-e62536a3666b",
    "goals": [{
        "uniqueName": "version#goals.ts:40"
      },
      {
        "uniqueName": "code-inspection#goals.ts:38"
      },
      {
        "uniqueName": "autofix#goals.ts:41"
      },
      {
        "uniqueName": "push-impact#goals.ts:39"
      },
      {
        "uniqueName": "fingerprint#goals.ts:45"
      },
      {
        "uniqueName": "build#goals.ts:42"
      },
      {
        "uniqueName": "docker-build#goals.ts:44"
      },
      {
        "uniqueName": "tag#goals.ts:43"
      },
      {
        "uniqueName": "publish-approval"
      },
      {
        "uniqueName": "release-npm"
      },
      {
        "uniqueName": "release-docker"
      },
      {
        "uniqueName": "release-docs"
      },
      {
        "uniqueName": "changelog#goals.ts:50"
      },
      {
        "uniqueName": "release-version"
      },
      {
        "uniqueName": "release-tag"
      }
    ],
    "goalSet": "Docker Build with Release",
    "sha": "491ccf53daa870c4d90c0ec2db4ad855b8af1e52"
  }
]`;

    it("handle goals with goalSet", () => {
        const envs = sortGoals(JSON.parse(goalsForGoalSetTest), JSON.parse(goalSetForGoalSetTest));
    });
});
