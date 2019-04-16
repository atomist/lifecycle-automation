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

import {
    Destination,
    EventFired,
    GraphClient,
    guid,
    HandlerContext,
    MessageOptions,
    MutationOptions,
} from "@atomist/automation-client";
import { SlackMessage } from "@atomist/slack-messages";
import "mocha";
import * as assert from "power-assert";
import { fail } from "power-assert";
import { StatusToPushLifecycle } from "../../../../lib/handlers/event/push/StatusToPushLifecycle";

describe("StatusToPushLifecycle", () => {

    /* tslint:disable */
    const payloadRaisePr = `
    {
  "data": {
    "Status": [{
      "_id": 124543,
      "commit": {
        "pushes": [{
          "builds": [{
            "buildId": "55826126",
            "buildUrl": "https://travis-ci.com/atomisthq/automation-api/builds/55826126",
            "name": "313",
            "provider": "travis",
            "status": "passed",
            "commit": {
              "sha": "a35f2cc17f5f0fa8fc9fbbe6c7debe23963feb52"
            },
            "timestamp": "2017-09-30T19:35:52.876Z"
          }],
          "before": {
            "sha": "71f587adade1c4d746f36ed0abd7f2d4c60167fa"
          },
          "after": {
            "sha": "a35f2cc17f5f0fa8fc9fbbe6c7debe23963feb52",
            "message": "MappedParameter support for user config",
            "statuses": [{
              "context": "continuous-integration/travis-ci/push",
              "description": "The Travis CI build passed",
              "targetUrl": "https://travis-ci.com/atomisthq/automation-api/builds/55826126?utm_source=github_status&utm_medium=notification",
              "state": "success"
            }],
            "tags": [{
                "name": "1.0.0",
                "release": {
                    "name": "release-1.0.0"
                }
            }]
          },
          "repo": {
            "owner": "atomisthq",
            "name": "automation-api",
            "channels": [{
              "name": "automation-api",
              "team": {
                "id": "T095SFFBK"
              }
            }],
            "labels": [{
              "name": "help wanted"
            }, {
              "name": "Discussion Required"
            }, {
              "name": "enhancement"
            }, {
              "name": "bug"
            }, {
              "name": "in-progress"
            }, {
              "name": "Discussion Required"
            }, {
              "name": "blocked"
            }, {
              "name": "bug"
            }, {
              "name": "enhancement"
            }, {
              "name": "enhancement"
            }],
            "org": {
              "provider": {
                        "providerType": "github_com"
                    }
            },
            "defaultBranch": "master"
          },
          "commits": [{
            "sha": "a35f2cc17f5f0fa8fc9fbbe6c7debe23963feb52",
            "message": "MappedParameter support for user config",
            "resolves": [],
            "impact": null,
            "apps": [],
            "tags": [],
            "author": {
              "login": "kipz",
              "person": {
                "chatId": {
                  "screenName": "kipz"
                }
              }
            },
            "timestamp": "2017-09-30T14:33:23-05:00"
          }],
          "timestamp": "2017-09-30T19:33:38.183Z",
          "branch": "prefs"
        }],
        "timestamp": "2017-09-30T14:33:23-05:00"
      }
    }]
  },
  "extensions": {
    "type": "READ_ONLY",
    "operationName": "StatusToPushLifecycle",
    "team_id": "T095SFFBK",
    "correlation_id": "4ff037a3-75ec-41ce-a1b2-5a7024233279"
  }
}`;
    /* tslint:enable */

    it("render Raise PR button for successful build", done => {
        let messageSent = false;
        class MockMessageClient {

            public send(msg: any, destinations: Destination, options?: MessageOptions): Promise<any> {
                const sm = msg as SlackMessage;
                assert(sm.attachments[0].actions.length === 1);
                assert(sm.attachments[0].actions[0].text === "Raise PR");
                assert(sm.attachments[1].text.includes("Release"));
                assert(sm.attachments[1].text.includes("release-1.0.0"));
                messageSent = true;
                return Promise.resolve();
            }

        }

        class MockGraphClient implements GraphClient {

            public endpoint = "";

            public mutate<T, Q>(optionsOrName: MutationOptions<Q> | string): Promise<T> {
                fail();
                return Promise.reject("Shouldn't call this");
            }

            public query<T, Q>(): Promise<T> {

                return Promise.resolve({
                    ChatTeam: [
                        {
                            orgs: [
                                {
                                    repo: [
                                        {
                                            owner: "atomisthq",
                                            name: "automation-api",
                                            branches: [
                                                {
                                                    name: "prefs",
                                                    deleted: false,
                                                    pullRequests: null,
                                                },
                                            ],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                } as any);

            }

            public executeQuery<T, Q>(query: string, variables?: Q): Promise<T> {
                fail();
                return Promise.reject("Shouldn't call this");
            }

            public executeQueryFromFile<T, Q>(query: string, variables?: Q): Promise<T> {
                fail();
                return Promise.reject("Shouldn't call this");
            }

            public executeMutationFromFile<T, Q>(mutationFile: string, variables?: Q): Promise<T> {
                fail();
                return Promise.reject("Shouldn't call this");
            }

            public executeMutation<T, Q>(mutation: string, variables?: Q): Promise<T> {
                fail();
                return Promise.reject("Shouldn't call this");
            }
        }

        const ctx = {
            teamId: "T095SFFBK",
            correlationId: "14340b3c-e5bc-4101-9b0a-24cb69fc6bb9",
            invocationId: guid(),
            graphClient: new MockGraphClient(),
            messageClient: new MockMessageClient(),
        };
        const handler = new StatusToPushLifecycle();
        handler.handle(JSON.parse(payloadRaisePr) as EventFired<any>, ctx as any as HandlerContext)
            .then(result => {
                assert(messageSent);
                assert(result.code === 0);
            })
            .then(done, done);

    });

    /* tslint:disable */
    const payloadNoChannel = `{
    "data": {
        "Status": [{
            "_id": 557056,
            "commit": {
                "pushes": [{
                    "builds": [],
                    "before": {
                        "sha": "c3f04c3b37eaee80923b3321c5304dfc2b8fb1ff"
                    },
                    "after": {
                        "sha": "886a5c0b985d55659c2c1fdf2542719846daafe2",
                        "message": "2017.4.0 \u00B7 release",
                        "statuses": [{
                            "context": "fingerprint/atomist",
                            "description": "No blocking Fingerprint changes",
                            "targetUrl": "",
                            "state": "success"
                        }],
                        "tags": []
                    },
                    "repo": {
                        "owner": "test-owner",
                        "name": "test-name",
                        "channels": [{
                            "name": ""
                        }],
                        "labels": [],
                        "org": {
                            "provider": {"private": false},
                            "chatTeam": {
                                "preferences": []
                            }
                        },
                        "defaultBranch": "master"
                    },
                    "commits": [{
                        "sha": "886a5c0b985d55659c2c1fdf2542719846daafe2",
                        "message": "2017.4.0 \u00B7 release",
                        "resolves": [],
                        "impact": {
                            "data": "[[[\\"travis\\",0],[\\"docker\\",0],[\\"props\\",0],[\\"rest\\",0],[\\"plugsMgt\\",1],[\\"depsMgt\\",0],[\\"plugins\\",0],[\\"deps\\",0]]]",
                            "url": ""
                        },
                        "apps": [],
                        "tags": [],
                        "author": {
                            "login": "testperson",
                            "person": null
                        },
                        "timestamp": "2017-10-18T13:25:19+01:00"
                    }],
                    "timestamp": "2017-10-18T12:25:53.168Z",
                    "branch": "release/2017.4.x"
                }],
                "timestamp": "2017-10-18T13:25:19+01:00"
            }
        }]
    },
    "extensions": {
        "type": "READ_ONLY",
        "operationName": "StatusToPushLifecycle",
        "team_id": "xxx",
        "team_name": "xxx",
        "correlation_id": "fe4a5e6b-d079-4687-ab04-baf0d2ee3faf"
    }
}`;
    /* tslint:enable */
    it("don't render message of empty channel", done => {
        const messageSent = false;
        class MockMessageClient {

            public send(msg: any, destinations: Destination, options?: MessageOptions): Promise<any> {
                return Promise.reject("Should be called");
            }

        }

        class MockGraphClient implements GraphClient {

            public endpoint = "";

            public mutate<T, Q>(optionsOrName: MutationOptions<Q> | string): Promise<T> {
                fail();
                return Promise.reject("Shouldn't call this");
            }

            public query<T, Q>(): Promise<T> {

                return Promise.resolve({
                    ChatTeam: [
                        {
                            orgs: [
                                {
                                    repo: [
                                        {
                                            owner: "atomisthq",
                                            name: "automation-api",
                                            branches: [
                                                {
                                                    name: "prefs",
                                                    deleted: false,
                                                    pullRequests: null,
                                                },
                                            ],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                } as any);

            }

            public executeQuery<T, Q>(query: string, variables?: Q): Promise<T> {
                fail();
                return Promise.reject("Shouldn't call this");
            }

            public executeQueryFromFile<T, Q>(query: string, variables?: Q): Promise<T> {
                fail();
                return Promise.reject("Shouldn't call this");
            }

            public executeMutationFromFile<T, Q>(mutationFile: string, variables?: Q): Promise<T> {
                fail();
                return Promise.reject("Shouldn't call this");
            }

            public executeMutation<T, Q>(mutation: string, variables?: Q): Promise<T> {
                fail();
                return Promise.reject("Shouldn't call this");
            }
        }

        const ctx = {
            teamId: "xxx",
            correlationId: "fe4a5e6b-d079-4687-ab04-baf0d2ee3faf",
            invocationId: guid(),
            graphClient: new MockGraphClient(),
            messageClient: new MockMessageClient(),
        };
        const handler = new StatusToPushLifecycle();
        handler.handle(JSON.parse(payloadNoChannel) as EventFired<any>, ctx as any as HandlerContext)
            .then(result => {
                assert(!messageSent);
                assert(result.code === 0);
            })
            .then(done, done);

    });

    /* tslint:disable */
    const payloadNoRaisePr = `
    {
  "data": {
    "Status": [{
      "_id": 124543,
      "commit": {
        "pushes": [{
          "builds": [{
            "buildId": "55826126",
            "buildUrl": "https://travis-ci.com/atomisthq/automation-api/builds/55826126",
            "name": "313",
            "provider": "travis",
            "status": "passed",
            "commit": {
              "sha": "a35f2cc17f5f0fa8fc9fbbe6c7debe23963feb52"
            },
            "timestamp": "2017-09-30T19:35:52.876Z"
          }],
          "before": {
            "sha": "71f587adade1c4d746f36ed0abd7f2d4c60167fa"
          },
          "after": {
            "sha": "a35f2cc17f5f0fa8fc9fbbe6c7debe23963feb52",
            "message": "MappedParameter support for user config",
            "statuses": [{
              "context": "continuous-integration/travis-ci/push",
              "description": "The Travis CI build passed",
              "targetUrl": "https://travis-ci.com/atomisthq/automation-api/builds/55826126?utm_source=github_status&utm_medium=notification",
              "state": "success"
            }],
            "tags": []
          },
          "repo": {
            "owner": "atomisthq",
            "name": "automation-api",
            "channels": [{
              "name": "automation-api",
              "team": {
                "id": "T095SFFBK"
              }
            }],
            "labels": [{
              "name": "help wanted"
            }, {
              "name": "Discussion Required"
            }, {
              "name": "enhancement"
            }, {
              "name": "bug"
            }, {
              "name": "in-progress"
            }, {
              "name": "Discussion Required"
            }, {
              "name": "blocked"
            }, {
              "name": "bug"
            }, {
              "name": "enhancement"
            }, {
              "name": "enhancement"
            }],
            "org": {
              "provider": {
                        "providerType": "github_com"
                    },
              "team": {
                "id": "T095SFFBK",
                "chatTeams": [{
                    "id": "T095SFFBK",
                    "preferences": [{
                        "name": "lifecycle_actions",
                        "value": "{\\"automation-api\\":{\\"push.raise_pullrequest\\":false}}"
                    }]
                }] 
              }
            },
            "defaultBranch": "master"
          },
          "commits": [{
            "sha": "a35f2cc17f5f0fa8fc9fbbe6c7debe23963feb52",
            "message": "MappedParameter support for user config",
            "resolves": [],
            "impact": null,
            "apps": [],
            "tags": [],
            "author": {
              "login": "kipz",
              "person": {
                "chatId": {
                  "screenName": "kipz"
                }
              }
            },
            "timestamp": "2017-09-30T14:33:23-05:00"
          }],
          "timestamp": "2017-09-30T19:33:38.183Z",
          "branch": "prefs"
        }],
        "timestamp": "2017-09-30T14:33:23-05:00"
      }
    }]
  },
  "extensions": {
    "type": "READ_ONLY",
    "operationName": "StatusToPushLifecycle",
    "team_id": "T095SFFBK",
    "correlation_id": "4ff037a3-75ec-41ce-a1b2-5a7024233279"
  }
}`;
    /* tslint:enable */

    it("don't render Raise PR button for successful build when button is disabled", done => {
        let messageSent = false;
        class MockMessageClient {

            public send(msg: any, destinations: Destination, options?: MessageOptions): Promise<any> {
                const sm = msg as SlackMessage;
                assert(sm.attachments[0].actions.length === 0);
                messageSent = true;
                return Promise.resolve();
            }
        }

        class MockGraphClient implements GraphClient {

            public endpoint = "";

            public mutate<T, Q>(optionsOrName: MutationOptions<Q> | string): Promise<T> {
                fail();
                return Promise.reject("Shouldn't call this");
            }

            public query<T, Q>(): Promise<T> {

                return Promise.resolve({
                    ChatTeam: [
                        {
                            orgs: [
                                {
                                    repo: [
                                        {
                                            owner: "atomisthq",
                                            name: "automation-api",
                                            branches: [
                                                {
                                                    name: "prefs",
                                                    deleted: false,
                                                    pullRequests: null,
                                                },
                                            ],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                } as any);

            }

            public executeQuery<T, Q>(query: string, variables?: Q): Promise<T> {
                fail();
                return Promise.reject("Shouldn't call this");
            }

            public executeQueryFromFile<T, Q>(query: string, variables?: Q): Promise<T> {
                fail();
                return Promise.reject("Shouldn't call this");
            }

            public executeMutationFromFile<T, Q>(mutationFile: string, variables?: Q): Promise<T> {
                fail();
                return Promise.reject("Shouldn't call this");
            }

            public executeMutation<T, Q>(mutation: string, variables?: Q): Promise<T> {
                fail();
                return Promise.reject("Shouldn't call this");
            }
        }

        const ctx = {
            teamId: "T095SFFBK",
            correlationId: "14340b3c-e5bc-4101-9b0a-24cb69fc6bb9",
            invocationId: guid(),
            graphClient: new MockGraphClient(),
            messageClient: new MockMessageClient(),
        };
        const handler = new StatusToPushLifecycle();
        handler.handle(JSON.parse(payloadNoRaisePr) as EventFired<any>, ctx as any as HandlerContext)
            .then(result => {
                assert(messageSent);
                assert(result.code === 0);
            })
            .then(done, done);

    });

    /* tslint:disable */
    const goalsJson = `[{
    "description": "Build successful",
    "preConditions": [{
      "environment": "0-code",
      "name": "version"
    }],
    "uniqueName": "build",
    "name": "build",
    "goalSet": "node docker",
    "goalSetId": "32787e94-7743-5024-bf7b-ec2fe6f55a76",
    "state": "failure",
    "retryFeasible": true,
    "id": "0e109dd6-b7c1-5832-9ba0-5853e4373be4",
    "url": null,
    "environment": "0-code",
    "ts": 1523543548060,
    "provenance": [{
      "registration": "@atomist/github-sdm",
      "version": "0.4.0-20180412134641",
      "name": "OnAnyRequestedSdmGoal",
      "correlationId": "963d58db-5b49-4a01-8616-3f9922ee6fd6",
      "ts": 1523543553349
    }, {
      "correlationId": "963d58db-5b49-4a01-8616-3f9922ee6fd6",
      "name": "SetGoalsOnPush",
      "registration": "@atomist/github-sdm",
      "ts": 1523543548060,
      "version": "0.4.0-20180412134641"
    }],
    "repo": {
      "owner": "test"
    }
  },
  {
    "description": "Code review passed",
    "preConditions": [],
    "uniqueName": "review",
    "name": "review",
    "goalSet": "node docker",
    "goalSetId": "32787e94-7743-5024-bf7b-ec2fe6f55a76",
    "state": "success",
    "id": "0f096d2b-7017-5981-bf39-fcf54f9f269f",
    "url": null,
    "environment": "0-code",
    "ts": 1523543548060,
    "provenance": [{
      "registration": "@atomist/github-sdm",
      "version": "0.4.0-20180412134641",
      "name": "OnAnyRequestedSdmGoal",
      "correlationId": "963d58db-5b49-4a01-8616-3f9922ee6fd6",
      "ts": 1523543553349
    }, {
      "correlationId": "963d58db-5b49-4a01-8616-3f9922ee6fd6",
      "name": "SetGoalsOnPush",
      "registration": "@atomist/github-sdm",
      "ts": 1523543548060,
      "version": "0.4.0-20180412134641"
    }],
    "repo": {
      "owner": "test"
    }
  },
  {
    "description": "Autofixed",
    "preConditions": [],
    "uniqueName": "autofix",
    "name": "autofix",
    "goalSet": "node docker",
    "goalSetId": "32787e94-7743-5024-bf7b-ec2fe6f55a76",
    "state": "success",
    "id": "026a5229-9199-57f5-bb54-b21939035790",
    "url": null,
    "environment": "0-code",
    "ts": 1523543548060,
    "provenance": [{
      "registration": "@atomist/github-sdm",
      "version": "0.4.0-20180412134641",
      "name": "OnAnyRequestedSdmGoal",
      "correlationId": "963d58db-5b49-4a01-8616-3f9922ee6fd6",
      "ts": 1523543553349
    }, {
      "correlationId": "963d58db-5b49-4a01-8616-3f9922ee6fd6",
      "name": "SetGoalsOnPush",
      "registration": "@atomist/github-sdm",
      "ts": 1523543548060,
      "version": "0.4.0-20180412134641"
    }],
    "repo": {
      "owner": "test"
    }
  },
  {
    "description": "Docker image built",
    "preConditions": [{
      "environment": "0-code",
      "name": "build"
    }],
    "uniqueName": "docker build",
    "name": "docker build",
    "goalSet": "node docker",
    "goalSetId": "32787e94-7743-5024-bf7b-ec2fe6f55a76",
    "state": "success",
    "id": "01e03224-d9b4-5eb1-91f6-0bbfdd4f1f90",
    "url": null,
    "environment": "0-code",
    "ts": 1523543548060,
    "provenance": [{
      "registration": "@atomist/github-sdm",
      "version": "0.4.0-20180412134641",
      "name": "OnAnyRequestedSdmGoal",
      "correlationId": "963d58db-5b49-4a01-8616-3f9922ee6fd6",
      "ts": 1523543553349
    }, {
      "correlationId": "963d58db-5b49-4a01-8616-3f9922ee6fd6",
      "name": "SetGoalsOnPush",
      "registration": "@atomist/github-sdm",
      "ts": 1523543548060,
      "version": "0.4.0-20180412134641"
    }],
    "repo": {
      "owner": "test"
    }
  },
  {
    "description": "Tagged",
    "preConditions": [{
        "environment": "0-code",
        "name": "docker build"
      },
      {
        "environment": "0-code",
        "name": "build"
      }
    ],
    "uniqueName": "tag",
    "name": "tag",
    "goalSet": "node docker",
    "goalSetId": "32787e94-7743-5024-bf7b-ec2fe6f55a76",
    "state": "success",
    "id": "03fd3ea6-ffa3-5961-9c89-1a487fa526ea",
    "url": null,
    "environment": "0-code",
    "ts": 1523543548060,
    "provenance": [{
      "registration": "@atomist/github-sdm",
      "version": "0.4.0-20180412134641",
      "name": "OnAnyRequestedSdmGoal",
      "correlationId": "963d58db-5b49-4a01-8616-3f9922ee6fd6",
      "ts": 1523543553349
    }, {
      "correlationId": "963d58db-5b49-4a01-8616-3f9922ee6fd6",
      "name": "SetGoalsOnPush",
      "registration": "@atomist/github-sdm",
      "ts": 1523543548060,
      "version": "0.4.0-20180412134641"
    }],
    "repo": {
      "owner": "test"
    }
  },
  {
    "description": "Versioned",
    "preConditions": [],
    "uniqueName": "version",
    "name": "version",
    "goalSet": "node docker",
    "goalSetId": "32787e94-7743-5024-bf7b-ec2fe6f55a76",
    "state": "success",
    "id": "32787e94-7743-5024-bf7b-ec2fe6f55a76",
    "url": null,
    "environment": "0-code",
    "ts": 1523543548060,
    "provenance": [{
      "registration": "@atomist/github-sdm",
      "version": "0.4.0-20180412134641",
      "name": "OnAnyRequestedSdmGoal",
      "correlationId": "963d58db-5b49-4a01-8616-3f9922ee6fd6",
      "ts": 1523543553349
    }, {
      "correlationId": "963d58db-5b49-4a01-8616-3f9922ee6fd6",
      "name": "SetGoalsOnPush",
      "registration": "@atomist/github-sdm",
      "ts": 1523543548060,
      "version": "0.4.0-20180412134641"
    }],
    "repo": {
      "owner": "test"
    }
  },
  {
    "description": "Deploy to test",
    "preConditions": [{
        "environment": "0-code",
        "name": "docker build"
      },
      {
        "environment": "0-code",
        "name": "build"
      }
    ],
    "uniqueName": "deploy to test",
    "name": "deploy to test",
    "goalSet": "node docker",
    "goalSetId": "32787e94-7743-5024-bf7b-ec2fe6f55a76",
    "state": "success",
    "id": "32787e94-7743-5024-bf7b-ec2fe6f55a76",
    "url": null,
    "environment": "1-deploy-test",
    "ts": 1523543548060,
    "provenance": [{
      "registration": "@atomist/github-sdm",
      "version": "0.4.0-20180412134641",
      "name": "OnAnyRequestedSdmGoal",
      "correlationId": "963d58db-5b49-4a01-8616-3f9922ee6fd6",
      "ts": 1523543553349
    }, {
      "correlationId": "963d58db-5b49-4a01-8616-3f9922ee6fd6",
      "name": "SetGoalsOnPush",
      "registration": "@atomist/github-sdm",
      "ts": 1523543548060,
      "version": "0.4.0-20180412134641"
    }],
    "repo": {
      "owner": "test"
    }
  },
  {
    "description": "Deploy to prod",
    "preConditions": [{
      "environment": "1-deploy-test",
      "name": "deploy to test"
    }],
    "uniqueName": "deploy to prod",
    "name": "deploy to prod",
    "goalSet": "node docker",
    "goalSetId": "32787e94-7743-5024-bf7b-ec2fe6f55a76",
    "state": "waiting_for_approval",
    "id": "32787e94-7743-5024-bf7b-ec2fe6f55a76",
    "url": null,
    "environment": "2-deploy-prod",
    "ts": 1523543548060,
    "provenance": [{
      "registration": "@atomist/github-sdm",
      "version": "0.4.0-20180412134641",
      "name": "OnAnyRequestedSdmGoal",
      "correlationId": "963d58db-5b49-4a01-8616-3f9922ee6fd6",
      "ts": 1523543553349
    }, {
      "correlationId": "963d58db-5b49-4a01-8616-3f9922ee6fd6",
      "name": "SetGoalsOnPush",
      "registration": "@atomist/github-sdm",
      "ts": 1523543548060,
      "version": "0.4.0-20180412134641"
    }],
    "repo": {
      "owner": "test"
    }
  },
  {
    "description": "Verify prod",
    "preConditions": [{
      "environment": "2-deploy-prod",
      "name": "deploy to prod"
    }],
    "uniqueName": "verify prod",
    "name": "verify prod",
    "goalSet": "node docker",
    "goalSetId": "32787e94-7743-5024-bf7b-ec2fe6f55a76",
    "state": "planned",
    "id": "32787e94-7743-5024-bf7b-ec2fe6f55a76",
    "url": null,
    "environment": "2-deploy-prod",
    "ts": 1523543548060,
    "provenance": [{
      "registration": "@atomist/github-sdm",
      "version": "0.4.0-20180412134641",
      "name": "OnAnyRequestedSdmGoal",
      "correlationId": "963d58db-5b49-4a01-8616-3f9922ee6fd6",
      "ts": 1523543553349
    }, {
      "correlationId": "963d58db-5b49-4a01-8616-3f9922ee6fd6",
      "name": "SetGoalsOnPush",
      "registration": "@atomist/github-sdm",
      "ts": 1523543548060,
      "version": "0.4.0-20180412134641"
    }],
    "repo": {
      "owner": "test"
    }
  },
  {
    "description": "Notify deployment",
    "uniqueName": "notify prod",
    "name": "notify prod",
    "goalSet": "node docker",
    "goalSetId": "32787e94-7743-5024-bf7b-ec2fe6f55a76",
    "state": "planned",
    "id": "32787e94-7743-5024-bf7b-ec2fe6f55a76",
    "url": null,
    "environment": "2-deploy-prod",
    "ts": 1523543548060,
    "provenance": [{
      "registration": "@atomist/github-sdm",
      "version": "0.4.0-20180412134641",
      "name": "OnAnyRequestedSdmGoal",
      "correlationId": "963d58db-5b49-4a01-8616-3f9922ee6fd6",
      "ts": 1523543553349
    }, {
      "correlationId": "963d58db-5b49-4a01-8616-3f9922ee6fd6",
      "name": "SetGoalsOnPush",
      "registration": "@atomist/github-sdm",
      "ts": 1523543548060,
      "version": "0.4.0-20180412134641"
    }],
    "repo": {
      "owner": "test"
    }
  }
]`;
    
    const payloadWithGoals = `{
  "data": {
    "Status": [{
      "_id": 1740274,
      "commit": {
        "pushes": [{
          "goals": ${goalsJson},
          "goalsDisplayState": [{
            "state": "show_all"
          }],
          "after": {
            "author": {
              "login": "jessitron",
              "person": {
                "chatId": {
                  "screenName": "jessitron"
                }
              }
            },
            "fingerprints": [{
              "data": null,
              "name": "dependencies",
              "sha": "e3a95168a2163577f707dd61d7172911034ddc9781698bd593e2365b546877dc048677a6845d7b8d6319cfdf53f39d21b4e2760c8a4c6501dae3050362b3f39b"
            }],
            "images": [{
              "_id": 1740311,
              "image": null,
              "imageName": "gcr.io/reference-implementation-1/spring-team/prendergast:7a6428da814f2cf541a7400c30e929aca58487a5",
              "pods": [{
                "_id": 1740315,
                "baseName": "rspring-team-0-prendergast9-576f96cdc7",
                "name": "rspring-team-0-prendergast9-576f96cdc7-9kd9m",
                "resourceVersion": 276210,
                "phase": "Running",
                "containers": [{
                  "_id": 1740318,
                  "ready": true,
                  "name": "rspring-team-0-prendergast9",
                  "restartCount": 0,
                  "resourceVersion": 276210,
                  "state": "running",
                  "environment": "testing",
                  "imageName": "gcr.io/reference-implementation-1/spring-team/prendergast:7a6428da814f2cf541a7400c30e929aca58487a5",
                  "timestamp": "2018-03-03T00:02:10.729Z",
                  "statusJSON": "{\\"name\\":\\"rspring-team-0-prendergast9\\",\\"state\\":{\\"running\\":{\\"startedAt\\":\\"2018-03-03T00:02:09Z\\"}},\\"lastState\\":{},\\"ready\\":true,\\"restartCount\\":0,\\"image\\":\\"gcr.io/reference-implementation-1/spring-team/prendergast:7a6428da814f2cf541a7400c30e929aca58487a5\\",\\"imageID\\":\\"docker-pullable://gcr.io/reference-implementation-1/spring-team/prendergast@sha256:88a75c9f8a3a64c671d15e953736d7f45a9e7f4e96b5c673b076431ef9db4641\\",\\"containerID\\":\\"docker://041088a4842fc66fb96d3298bef25b0c6096d2538765df20906bf6afd7990d6c\\"}"
                }],
                "environment": "testing",
                "timestamp": "2018-03-03T00:02:05Z",
                "namespace": "rt5964n9b7-0-testing9"
              }],
              "timestamp": "2018-03-03T00:01:57.832Z"
            }],
            "message": "Enable deployment to Kubernetes\\n\\nMerge pull request #1",
            "sha": "7a6428da814f2cf541a7400c30e929aca58487a5",
            "statuses": [],
            "tags": []
          },
          "before": {
            "sha": "3888e1785cf230649490b3497981da05d2b50387"
          },
          "branch": "master",
          "builds": [{
            "buildId": "spring-team/prendergast/7a6428da814f2cf541a7400c30e929aca58487a5",
            "buildUrl": "https://storage.googleapis.com/reference-implementation-1-build-logs-1/log-6a28cbd7-cbed-4a7f-b2d3-2176b5863725.txt?GoogleAccessId=container-ci-1@reference-implementation-1.iam.gserviceaccount.com&Expires=1520121717&Signature=OZFuIlD1dOzHPmUsJmVZ%2BfkWqqQm1qpBE6mu4NvsAEa9MLuhmWScHCDBesc47M3LI5j4bzMvXT%2BPiQUQPyBQC93rraKHj2W8AAlm1NagR2oNgkB4hv4inqdP5ZAhKaiao5FZ2zKv1M%2BhERcX9Lm5tTN8BCr6c9kMrF6whV8nuNPQOr%2BrL6vh3O06%2FjDdBakvctvARVD4LjfrYgLgV5q79UW6x7%2BzL5NAyqO354RAS3Hwi9A7iDwqHJBRNylO1S7CPaF58JsdjNW8DQxWcKonpMjTPg1S7EnAUHDWap1589m1Rg8la9m%2Fxj%2F50sGgUU8kWEf%2FPZ08p1k9Ie9QSA%2FFdQ%3D%3D",
            "commit": {
              "sha": "7a6428da814f2cf541a7400c30e929aca58487a5"
            },
            "name": "build 7a6428da814f2cf541a7400c30e929aca58487a5 of spring-team/prendergast",
            "provider": "GoogleContainerBuilder",
            "status": "passed",
            "timestamp": "2018-03-03T00:01:57.943Z",
            "workflow": null
          }],
          "commits": [{
            "apps": [{
              "data": "{}",
              "domain": "testing",
              "host": "rspring-team-0-prendergast9-576f96cdc7-9kd9m",
              "state": "started"
            }, {
              "data": "{}",
              "domain": "development",
              "host": "27f47aa24c42",
              "state": "stopping"
            }, {
              "data": "{}",
              "domain": "development",
              "host": "815dc310fd73",
              "state": "stopping"
            }],
            "author": {
              "login": "jessitron",
              "person": {
                "chatId": {
                  "screenName": "jessitron"
                }
              }
            },
            "impact": {
              "data": "[[[\\"deps\\",0]],[[\\"deps\\",0]]]",
              "url": ""
            },
            "message": "Enable deployment to Kubernetes\\n\\nMerge pull request #1",
            "resolves": [],
            "sha": "7a6428da814f2cf541a7400c30e929aca58487a5",
            "tags": [],
            "timestamp": "2018-03-02T18:00:20-06:00"
          }, {
            "apps": [],
            "author": {
              "login": "jessitron",
              "person": {
                "chatId": {
                  "screenName": "jessitron"
                }
              }
            },
            "impact": {
              "data": "[[[\\"deps\\",0]]]",
              "url": ""
            },
            "message": "enable deployment to kubernetes",
            "resolves": [],
            "sha": "b2ed7524932d7f7ab9075de61f8508398cc9d1a2",
            "tags": [],
            "timestamp": "2018-03-03T00:00:10Z"
          }],
          "repo": {
            "channels": [{
              "name": "prendergast",
              "team": {
                "id": "T5964N9B7"
              }
            }],
            "defaultBranch": "master",
            "labels": [{
              "name": "wontfix"
            }, {
              "name": "question"
            }, {
              "name": "invalid"
            }, {
              "name": "help wanted"
            }, {
              "name": "good first issue"
            }, {
              "name": "enhancement"
            }, {
              "name": "duplicate"
            }, {
              "name": "bug"
            }],
            "name": "prendergast",
            "org": {
              "provider": {
                "apiUrl": "https://api.github.com/",
                "gitUrl": "git@github.com:",
                "url": "https://github.com/",
                "providerType": "github_com"
              },
              "team": {
                "chatTeams": [{
                  "id": "T5964N9B7",
                  "preferences": [{
                    "name": "lifecycle_preferences",
                    "value": "{\\"push\\":{\\"configuration\\":{\\"emoji-style\\":\\"atomist\\",\\"show-statuses-on-push\\":true,\\"build\\":{\\"style\\":\\"decorator\\"},\\"fingerprints\\":{\\"about-hint\\":false,\\"render-unchanged\\":true,\\"style\\":\\"fingerprint-inline\\"}}},\\"pull_request\\":{\\"configuration\\":{\\"emoji-style\\":\\"atomist\\"}}}"
                  }, {
                    "name": "disable_bot_owner_on_github_activity_notification",
                    "value": "true"
                  }]
                }],
                "id": "T5964N9B7"
              }
            },
            "owner": "spring-team"
          },
          "timestamp": "2018-03-03T00:00:22.275Z"
        }],
        "timestamp": "2018-03-02T18:00:20-06:00"
      },
      "context": "sdm/atomist/1-staging/5-verifyEndpoint",
      "description": "Failed to verify endpoint in Test",
      "state": "failure",
      "targetUrl": "https://sdm.atomist.io/T5964N9B7/testing/spring-team/prendergast/?atomist:approve=true"
    }]
  },
  "extensions": {
    "operationName": "StatusToPushLifecycle",
    "team_id": "T5964N9B7",
    "team_name": "Atomist",
    "correlation_id": "95a190ee-a6cb-427e-b151-0144d1736763"
  },
  "api_version": "1",
  "secrets": [{
    "uri": "github://org_token",
    "value": "1**************************************a"
  }]
}`;
    /* tslint:enable */

    it("render goal attachments separately per env", done => {
        let messageSent = false;
        class MockMessageClient {

            public send(msg: any, destinations: Destination, options?: MessageOptions): Promise<any> {
                const sm = msg as SlackMessage;
                assert(sm.attachments.length === 7);
                assert(sm.attachments[1].author_name === "Goals");
                assert(sm.attachments[3].actions.length === 2);
                assert(sm.attachments[3].actions[0].text === "Restart _build_");
                assert(sm.attachments[3].actions[1].text === "Approve _deploy to prod_");
                messageSent = true;
                return Promise.resolve();
            }

        }

        class MockGraphClient implements GraphClient {

            public endpoint = "";

            public mutate<T, Q>(optionsOrName: MutationOptions<Q> | string): Promise<T> {
                fail();
                return Promise.reject("Shouldn't call this");
            }

            public query(): Promise<any> {
                return Promise.resolve({});
            }

            public executeQuery<T, Q>(query: string, variables?: Q): Promise<T> {
                fail();
                return Promise.reject("Shouldn't call this");
            }

            public executeQueryFromFile<T, Q>(query: string, variables?: Q): Promise<T> {
                fail();
                return Promise.reject("Shouldn't call this");
            }

            public executeMutationFromFile<T, Q>(mutationFile: string, variables?: Q): Promise<T> {
                fail();
                return Promise.reject("Shouldn't call this");
            }

            public executeMutation<T, Q>(mutation: string, variables?: Q): Promise<T> {
                fail();
                return Promise.reject("Shouldn't call this");
            }
        }

        const ctx = {
            teamId: "T095SFFBK",
            correlationId: "14340b3c-e5bc-4101-9b0a-24cb69fc6bb9",
            invocationId: guid(),
            graphClient: new MockGraphClient(),
            messageClient: new MockMessageClient(),
        };
        const handler = new StatusToPushLifecycle();
        handler.handle(JSON.parse(payloadWithGoals) as EventFired<any>, ctx as any as HandlerContext)
            .then(result => {
                assert(messageSent);
                assert(result.code === 0);
            })
            .then(done, done);

    });
});
