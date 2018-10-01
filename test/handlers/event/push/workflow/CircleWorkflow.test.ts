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
import { circleWorkflowtoStages } from "../../../../../lib/handlers/event/push/workflow/CircleWorkflow";
import { WorkflowStage } from "../../../../../lib/handlers/event/push/workflow/WorkflowStage";
import { BuildStatus } from "../../../../../lib/typings/types";
import * as graphql from "../../../../../lib/typings/types";

describe("CircleWorkflow", () => {
    const workflowConfig = "version: 2\njobs:\n  build:\n    docker:\n      - image: circleci/node:8.4\n    " +
        "working_directory: ~/repo\n    steps:\n      - checkout\n      - run: env\n  one0:\n    docker:\n      " +
        "- image: circleci/node:8.4\n    steps:\n      - run: env\n  one1:\n    docker:\n      " +
        "- image: circleci/node:8.4\n    steps:\n      - run: env\n  one2:\n    docker:\n      " +
        "- image: circleci/node:8.4\n    steps:\n      - run: env\n  one3:\n    docker:\n      " +
        "- image: circleci/node:8.4\n    steps:\n      - run: env\n  test:\n    docker:\n      " +
        "- image: circleci/node:8.4\n    steps:\n      - run: env\n  two0:\n    docker:\n      " +
        "- image: circleci/node:8.4\n    steps:\n      - run: env\n  two1:\n    docker:\n      " +
        "- image: circleci/node:8.4\n    steps:\n      - run: env\n  publish:\n    docker:\n      " +
        "- image: circleci/node:8.4\n    steps:\n      - run: env\n  three0:\n    docker:\n      " +
        "- image: circleci/node:8.4\n    steps:\n      - run: env\n  three1:\n    docker:\n      " +
        "- image: circleci/node:8.4\n    steps:\n      - run: env\n  four0:\n    docker:\n      " +
        "- image: circleci/node:8.4\n    steps:\n      - run: env\n  staging:\n    docker:\n      " +
        "- image: circleci/node:8.4\n    steps:\n      - run: env\n  promote:\n    docker:\n      " +
        "- image: circleci/node:8.4\n    steps:\n      - run: env\n\nworkflows:\n  version: 2\n  " +
        "cd_pipeline:\n    jobs:\n      - build\n      - one0:\n          requires:\n            " +
        "- build\n      - one1:\n          requires:\n            - build\n      - one2:\n          " +
        "requires:\n            - build\n      - one3:\n          requires:\n            " +
        "- build\n      - test:\n          requires:\n            - one0\n            - one1\n            " +
        "- one2\n            - one3\n      - two0:\n          requires:\n            - test\n      " +
        "- two1:\n          requires:\n            - test\n      - publish:\n          requires:\n            " +
        "- two0\n            - two1\n      - three0:\n          requires:\n            - publish\n      " +
        "- three1:\n          requires:\n            - publish\n      - four0:\n          requires:\n            " +
        "- three1\n      - staging:\n          requires:\n            - three0\n            - four0\n      " +
        "- promote:\n          requires:\n            - staging\n            \nnotify:\n  webhooks:\n    " +
        "- url: https://webhook-staging.atomist.services/atomist/circle/teams/T1L0VDKJP\n    \n";

    it("construct completed workflow stages", () => {
        const workflow = {
            id: "workflow id",
            name: "pipelineDooling",
            provider: "circle",
            config: workflowConfig,
            builds: [
                {
                    id: "build id 1",
                    status: "passed",
                    buildUrl: "buildUrl1",
                    startedAt: "2017-10-30T17:38:31.564Z",
                    finishedAt: "2017-10-30T17:38:33.516Z",
                    jobName: "build",
                    jobId: "job id 1",
                }, {
                    id: "build id 1",
                    status: "passed",
                    buildUrl: "buildUrl2",
                    startedAt: "2017-10-30T17:38:40.329Z",
                    finishedAt: "2017-10-30T17:38:41.362Z",
                    jobName: "one2",
                    jobId: "job id 2",
                }, {
                    id: "build id 1",
                    status: "passed",
                    buildUrl: "buildUrl3",
                    startedAt: "2017-10-30T17:38:41.009Z",
                    finishedAt: "2017-10-30T17:38:42.085Z",
                    jobName: "one1",
                    jobId: "job id 3",
                }, {
                    id: "build id 1",
                    status: "passed",
                    buildUrl: "buildUrl4",
                    startedAt: "2017-10-30T17:38:44.541Z",
                    finishedAt: "2017-10-30T17:38:46.898Z",
                    jobName: "one3",
                    jobId: "job id 4",
                }, {
                    id: "build id 1",
                    status: "passed",
                    buildUrl: "buildUrl5",
                    startedAt: "2017-10-30T17:38:41.769Z",
                    finishedAt: "2017-10-30T17:39:04.774Z",
                    jobName: "one0",
                    jobId: "job id 5",
                }, {
                    id: "build id 1",
                    status: "passed",
                    buildUrl: "buildUrl6",
                    startedAt: "2017-10-30T17:39:08.463Z",
                    finishedAt: "2017-10-30T17:39:14.939Z",
                    jobName: "test",
                    jobId: "job id 6",
                }, {
                    id: "build id 1",
                    status: "passed",
                    buildUrl: "buildUrl7",
                    startedAt: "2017-10-30T17:39:21.929Z",
                    finishedAt: "2017-10-30T17:39:29.291Z",
                    jobName: "two1",
                    jobId: "job id 7",
                }, {
                    id: "build id 1",
                    status: "passed",
                    buildUrl: "buildUrl8",
                    startedAt: "2017-10-30T17:39:26.256Z",
                    finishedAt: "2017-10-30T17:39:55.603Z",
                    jobName: "two0",
                    jobId: "job id 8",
                }, {
                    id: "build id 1",
                    status: "passed",
                    buildUrl: "buildUrl9",
                    startedAt: "2017-10-30T17:40:00.066Z",
                    finishedAt: "2017-10-30T17:40:01.048Z",
                    jobName: "publish",
                    jobId: "job id 9",
                }, {
                    id: "build id 1",
                    status: "passed",
                    buildUrl: "buildUrl10",
                    startedAt: "2017-10-30T17:40:06.743Z",
                    finishedAt: "2017-10-30T17:40:07.671Z",
                    jobName: "three0",
                    jobId: "job id 10",
                }, {
                    id: "build id 1",
                    status: "passed",
                    buildUrl: "buildUrl11",
                    startedAt: "2017-10-30T17:40:07.567Z",
                    finishedAt: "2017-10-30T17:40:08.783Z",
                    jobName: "three1",
                    jobId: "job id 11",
                }, {
                    id: "build id 1",
                    status: "passed",
                    buildUrl: "buildUrl12",
                    startedAt: "2017-10-30T17:40:18.291Z",
                    finishedAt: "2017-10-30T17:40:40.016Z",
                    jobName: "four0",
                    jobId: "job id 12",
                }, {
                    id: "build id 1",
                    status: "passed",
                    buildUrl: "buildUrl13",
                    startedAt: "2017-10-30T17:41:25.399Z",
                    finishedAt: "2017-10-30T17:41:26.448Z",
                    jobName: "staging",
                    jobId: "job id 13",
                }, {
                    id: "build id 1",
                    status: "passed",
                    buildUrl: "buildUrl14",
                    startedAt: "2017-10-30T17:41:33.411Z",
                    finishedAt: "2017-10-30T17:41:35.213Z",
                    jobName: "promote",
                    jobId: "job id 14",
                },
            ],
        } as graphql.PushFields.Workflow;
        const stages = circleWorkflowtoStages(workflow);
        const expectedStages: WorkflowStage[] = [
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
        assert.deepEqual(stages, expectedStages);
    });

    it("construct failed workflow", () => {
        const workflow = {
            id: "workflow id",
            name: "pipelineDooling",
            provider: "circle",
            config: workflowConfig,
            builds: [
                {
                    id: "build id 1",
                    status: "passed" as BuildStatus,
                    buildUrl: "buildUrl1",
                    startedAt: "2017-10-30T17:38:31.564Z",
                    finishedAt: "2017-10-30T17:38:33.516Z",
                    jobName: "build",
                    jobId: "job id 1",
                }, {
                    id: "build id 1",
                    status: "passed" as BuildStatus,
                    buildUrl: "buildUrl2",
                    startedAt: "2017-10-30T17:38:40.329Z",
                    finishedAt: "2017-10-30T17:38:41.362Z",
                    jobName: "one2",
                    jobId: "job id 2",
                }, {
                    id: "build id 1",
                    status: "failed" as BuildStatus,
                    buildUrl: "buildUrl3",
                    startedAt: "2017-10-30T17:38:41.009Z",
                    finishedAt: "2017-10-30T17:38:42.085Z",
                    jobName: "one1",
                    jobId: "job id 3",
                }, {
                    id: "build id 1",
                    status: "passed" as BuildStatus,
                    buildUrl: "buildUrl4",
                    startedAt: "2017-10-30T17:38:44.541Z",
                    finishedAt: "2017-10-30T17:38:46.898Z",
                    jobName: "one3",
                    jobId: "job id 4",
                },
            ],
        } as graphql.PushFields.Workflow;
        const stages = circleWorkflowtoStages(workflow);
        const expectedStages: WorkflowStage[] = [
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
        assert.deepEqual(stages, expectedStages);
    });

    it("should handle workflow config with unused stages", () => {
        const workflow = {
            id: "workflow id",
            name: "pipelineDooling",
            provider: "circle",
            config: `workflows:
  version: 2
  cd_pipeline:
    jobs:
      - build
      - valid:
          requires:
            - build
      - invalid:
          requires:
            - dne
`,
            builds: [
                {
                    id: "build id 1",
                    status: "passed" as BuildStatus,
                    buildUrl: "buildUrl1",
                    startedAt: "2017-10-30T17:38:31.564Z",
                    finishedAt: "2017-10-30T17:38:33.516Z",
                    jobName: "build",
                    jobId: "job id 1",
                },
            ],
        } as graphql.PushFields.Workflow;
        const stages = circleWorkflowtoStages(workflow);
        const expectedStages: WorkflowStage[] = [
            {
                name: "build",
                status: {
                    state: "passed" as BuildStatus,
                    totalDuration: 1952,
                    longestJobDuration: 1952,
                },
            }, {
                name: "valid",
            },
        ];
        assert.deepEqual(stages, expectedStages);
    });

    it("should give stage a started status if all jobs have not completed", () => {
        const workflow = {
            id: "workflow id",
            name: "pipelineDooling",
            provider: "circle",
            config: `workflows:
  version: 2
  cd_pipeline:
    jobs:
      - build
      - one:
          requires:
            - build
      - two:
          requires:
            - build
`,
            builds: [
                {
                    id: "build id 1",
                    status: "passed" as BuildStatus,
                    buildUrl: "buildUrl1",
                    startedAt: "2017-10-30T17:38:31.564Z",
                    finishedAt: "2017-10-30T17:38:33.516Z",
                    jobName: "build",
                    jobId: "job id 1",
                }, {
                    id: "build id 2",
                    status: "passed" as BuildStatus,
                    buildUrl: "buildUrl9",
                    startedAt: "2017-10-30T17:40:00.066Z",
                    finishedAt: "2017-10-30T17:40:01.048Z",
                    jobName: "two",
                    jobId: "job id 2",
                },
            ],
        } as graphql.PushFields.Workflow;
        const stages = circleWorkflowtoStages(workflow);
        const expectedStages: WorkflowStage[] = [
            {
                name: "build",
                status: {
                    state: "passed" as BuildStatus,
                    totalDuration: 1952,
                    longestJobDuration: 1952,
                },
            }, {
                name: "two",
                status: {
                    state: "started" as BuildStatus,
                    totalDuration: 982,
                    longestJobDuration: 982,
                },
            },
        ];
        assert.deepEqual(stages, expectedStages);
    });

    it("should order stages in config order when stage order is ambiguous", () => {
        const workflow = {
            id: "workflow id",
            name: "pipelineDooling",
            provider: "circle",
            config: `workflows:
  version: 2
  cd_pipeline:
    jobs:
      - build
      - one:
          requires:
            - build
      - two:
          requires:
            - build
      - afterOne:
          requires:
            - one
      - afterTwo:
          requires:
            - two
`,
            builds: [
                {
                    id: "build id 1",
                    status: "passed" as BuildStatus,
                    buildUrl: "buildUrl1",
                    startedAt: "2017-10-30T17:38:31.564Z",
                    finishedAt: "2017-10-30T17:38:33.516Z",
                    jobName: "build",
                    jobId: "job id 1",
                },
            ],
        } as graphql.PushFields.Workflow;
        const stages = circleWorkflowtoStages(workflow);
        const expectedStages: WorkflowStage[] = [
            {
                name: "build",
                status: {
                    state: "passed" as BuildStatus,
                    totalDuration: 1952,
                    longestJobDuration: 1952,
                },
            }, {
                name: "one",
            }, {
                name: "afterOne",
            }, {
                name: "afterTwo",
            },
        ];
        assert.deepEqual(stages, expectedStages);
    });

    it("should order executed stages first when stage order is ambiguous", () => {
        const workflow = {
            id: "workflow id",
            name: "pipelineDooling",
            provider: "circle",
            config: `workflows:
  version: 2
  cd_pipeline:
    jobs:
      - build
      - one:
          requires:
            - build
      - two:
          requires:
            - build
      - afterOne:
          requires:
            - one
      - afterTwo:
          requires:
            - two
`,
            builds: [
                {
                    id: "build id 1",
                    status: "passed" as BuildStatus,
                    buildUrl: "buildUrl1",
                    startedAt: "2017-10-30T17:38:31.564Z",
                    finishedAt: "2017-10-30T17:38:33.516Z",
                    jobName: "build",
                    jobId: "job id 1",
                }, {
                    id: "build id 2",
                    status: "passed" as BuildStatus,
                    buildUrl: "buildUrl9",
                    startedAt: "2017-10-30T17:40:00.066Z",
                    finishedAt: "2017-10-30T17:40:01.048Z",
                    jobName: "two",
                    jobId: "job id 2",
                }, {
                    id: "build id 3",
                    status: "passed" as BuildStatus,
                    buildUrl: "buildUrl2",
                    startedAt: "2017-10-30T17:38:40.329Z",
                    finishedAt: "2017-10-30T17:38:41.362Z",
                    jobName: "afterTwo",
                    jobId: "job id 3",
                },
            ],
        } as graphql.PushFields.Workflow;
        const stages = circleWorkflowtoStages(workflow);
        const expectedStages: WorkflowStage[] = [
            {
                name: "build",
                status: {
                    state: "passed" as BuildStatus,
                    totalDuration: 1952,
                    longestJobDuration: 1952,
                },
            }, {
                name: "two",
                status: {
                    state: "started" as BuildStatus,
                    totalDuration: 982,
                    longestJobDuration: 982,
                },
            }, {
                name: "afterTwo",
                status: {
                    state: "passed" as BuildStatus,
                    totalDuration: 1033,
                    longestJobDuration: 1033,
                },
            }, {
                name: "afterOne",
            },
        ];
        assert.deepEqual(stages, expectedStages);
    });

    it("should handle multiple initial jobs", () => {
        const workflow = {
            id: "workflow id",
            name: "pipelineDooling",
            provider: "circle",
            config: `workflows:
  version: 2
  wf1:
    jobs:
    - init1
    - init2
    - start_build:
        requires:
        - init1
        - init2
    - fanout1:
        requires:
        - start_build
    - fanout2:
        requires:
        - start_build
    - fanout3:
        requires:
        - start_build
    - deploy:
        requires:
        - fanout1
        - fanout2
        - fanout3
`,
            builds: [
                {
                    id: "build id 1",
                    status: "passed",
                    buildUrl: "buildUrl1",
                    startedAt: "2017-10-30T17:38:31.564Z",
                    finishedAt: "2017-10-30T17:38:33.516Z",
                    jobName: "init1",
                    jobId: "job id 1",
                },
            ],
        } as graphql.PushFields.Workflow;
        const stages = circleWorkflowtoStages(workflow);
        const expectedStages: WorkflowStage[] = [
            {
                name: "init1",
                status: {
                    state: "started" as BuildStatus,
                    totalDuration: 1952,
                    longestJobDuration: 1952,
                },
            }, {
                name: "start_build",
            }, {
                name: "fanout1",
            }, {
                name: "deploy",
            },
        ];
        assert.deepEqual(stages, expectedStages);
    });

    const branchFilterWorkflow = {
        id: "workflow id",
        name: "pipelineDooling",
        provider: "circle",
        config: `workflows:
  version: 2
  dev_stage_pre-prod:
    jobs:
      - test_dev:
          filters:
            branches:
              only:
                - dev
                - /user-.*/
      - test_stage:
          filters:
            branches:
              only: stage
      - test_pre-prod:
          filters:
            branches:
              only: /pre-prod(?:-.+)?$/
      - test_req:
          requires:
            - test_stage
      - test_init:
`,
        builds: [],
    } as graphql.PushFields.Workflow;

    it("should run branch filter jobs where no branch matches", () => {
        const stages = circleWorkflowtoStages(branchFilterWorkflow);
        const expectedStages: WorkflowStage[] = [{
            name: "test_init",
        }];
        assert.deepEqual(stages, expectedStages);
    });

    it("should run branch filter jobs where branch matches exactly", () => {
        const stages = circleWorkflowtoStages(branchFilterWorkflow, {name: "stage", type: "branch"});
        const expectedStages: WorkflowStage[] = [{
            name: "test_stage",
        }, {
            name: "test_req",
        }];
        assert.deepEqual(stages, expectedStages);
    });

    it("should run branch filter jobs where branch matches regex", () => {
        const stages = circleWorkflowtoStages(branchFilterWorkflow, {name: "pre-prod-1", type: "branch"});
        const expectedStages: WorkflowStage[] = [{
            name: "test_pre-prod",
        }];
        assert.deepEqual(stages, expectedStages);
    });

    it("should not run jobs without tag filters for tag push", () => {
        const stages = circleWorkflowtoStages(branchFilterWorkflow, {name: "stage", type: "tag"});
        const expectedStages: WorkflowStage[] = [];
        assert.deepEqual(stages, expectedStages);
    });

    const tagIgnoreWorkflow = {
        id: "workflow id",
        name: "pipelineDooling",
        provider: "circle",
        config: `workflows:
  version: 2
  build-workflow:
    jobs:
      - build:
          filters:
            tags:
              ignore: /^testing-.*/
`,
        builds: [],
    } as graphql.PushFields.Workflow;

    it("should run tag filter jobs", () => {
        const stages = circleWorkflowtoStages(tagIgnoreWorkflow);
        const expectedStages: WorkflowStage[] = [{
            name: "build",
        }];
        assert.deepEqual(stages, expectedStages);
    });

    it("should run tag filter jobs for nonignored tag push", () => {
        const stages = circleWorkflowtoStages(tagIgnoreWorkflow, {name: "1", type: "tag"});
        const expectedStages: WorkflowStage[] = [{
            name: "build",
        }];
        assert.deepEqual(stages, expectedStages);
    });

    it("should not run tag filter jobs for ignored tag push", () => {
        const stages = circleWorkflowtoStages(tagIgnoreWorkflow, {name: "testing-1", type: "tag"});
        const expectedStages: WorkflowStage[] = [];
        assert.deepEqual(stages, expectedStages);
    });

    const branchAndTagFiltersWorkflow = {
        id: "workflow id",
        name: "pipelineDooling",
        provider: "circle",
        config: `workflows:
  version: 2
  build-n-deploy:
    jobs:
      - build:
          filters:
            tags:
              only: /.*/
      - deploy:
          requires:
            - build
          filters:
            tags:
              only: /^config-test.*/
            branches:
              ignore: /.*/
`,
        builds: [],
    } as graphql.PushFields.Workflow;

    it("should run tag only jobs for branch push", () => {
        const stages = circleWorkflowtoStages(branchAndTagFiltersWorkflow);
        const expectedStages: WorkflowStage[] = [{
            name: "build",
        }];
        assert.deepEqual(stages, expectedStages);
    });

    it("should not run tag only jobs for nonmatching tags", () => {
        const stages = circleWorkflowtoStages(branchAndTagFiltersWorkflow, {name: "testing-1", type: "tag"});
        const expectedStages: WorkflowStage[] = [{
            name: "build",
        }];
        assert.deepEqual(stages, expectedStages);
    });

    it("should run tag only jobs for matching tags", () => {
        const stages = circleWorkflowtoStages(branchAndTagFiltersWorkflow, {name: "config-test-1", type: "tag"});
        const expectedStages: WorkflowStage[] = [{
            name: "build",
        }, {
            name: "deploy",
        }];
        assert.deepEqual(stages, expectedStages);
    });

    const branchAndTagFiltersWorkflow2 = {
        id: "workflow id",
        name: "pipelineDooling",
        provider: "circle",
        config: `workflows:
  version: 2
  build-n-deploy:
    jobs:
      - build:
          filters:
            tags:
              only: /^config-test.*/
      - test:
          requires:
            - build
          filters:
            tags:
              only: /^config-test.*/
      - deploy:
          requires:
            - test
          filters:
            tags:
              only: /^config-test.*/
            branches:
              ignore: /.*/
`,
        builds: [],
    } as graphql.PushFields.Workflow;

    it("should not run branch ignore all job for branch push", () => {
        const stages = circleWorkflowtoStages(branchAndTagFiltersWorkflow2);
        const expectedStages: WorkflowStage[] = [{
            name: "build",
        }, {
            name: "test",
        }];
        assert.deepEqual(stages, expectedStages);
    });

    it("should not run tag only jobs for nonmatching tags 2", () => {
        const stages = circleWorkflowtoStages(branchAndTagFiltersWorkflow2,
            {name: "testing-1", type: "tag"});
        const expectedStages: WorkflowStage[] = [];
        assert.deepEqual(stages, expectedStages);
    });

    it("should run tag only jobs for matching tags 2", () => {
        const stages = circleWorkflowtoStages(branchAndTagFiltersWorkflow2, {name: "config-test-1", type: "tag"});
        const expectedStages: WorkflowStage[] = [{
            name: "build",
        }, {
            name: "test",
        }, {
            name: "deploy",
        }];
        assert.deepEqual(stages, expectedStages);
    });

});
