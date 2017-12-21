import { EventFired } from "@atomist/automation-client/HandleEvent";
import { HandlerContext } from "@atomist/automation-client/HandlerContext";
import { guid } from "@atomist/automation-client/internal/util/string";
import { MessageOptions } from "@atomist/automation-client/spi/message/MessageClient";
import { MessageClientSupport } from "@atomist/automation-client/spi/message/MessageClientSupport";
import { SlackMessage } from "@atomist/slack-messages/SlackMessages";
import "mocha";
import * as assert from "power-assert";
import { PushToPushLifecycle } from "../../../../src/handlers/event/push/PushToPushLifecycle";

describe("PushToPushLifecycle", () => {

    /* tslint:disable */
    const payload = `{
    "data": {
        "Push": [{
            "_id": 544370,
            "builds": [],
            "before": {
                "sha": "6118d2b42f65026311ff1f8bc60c40e36e3a0452"
            },
            "after": {
                "sha": "2887cd5b1c9e3d3d725da4dfb024d7e96ed82d92",
                "message": "some commit",
                "statuses": [],
                "tags": []
            },
            "repo": {
                "owner": "some-owner",
                "name": "some-repo",
                "channels": [{
                    "name": "some-channel1"
                  },
                  {
                    "name": "some-channel2"
                  }],
                "labels": [{
                    "name": "accepted"
                }],
                "org": {
                    "provider": null,
                    "chatTeam": {
                        "preferences": [{
                            "name": "lifecycle_branches",
                            "value": "[{\\"name\\":\\"^some-ch.*el1$\\",\\"repositories\\":[{\\"owner\\":\\"some-owner\\",\\"name\\":\\"some-repo\\",%%CONFIG%%}]}]"
                          }]
                    }
                },
                "defaultBranch": "master"
            },
            "commits": [{
                "sha": "2887cd5b1c9e3d3d725da4dfb024d7e96ed82d92",
                "message": "some commit",
                "resolves": [],
                "impact": null,
                "apps": [],
                "tags": [],
                "author": {
                    "login": "",
                    "person": null
                },
                "timestamp": "2017-10-17T01:46:12Z"
            }],
            "timestamp": "2017-10-17T01:46:14.409Z",
            "branch": "master"
        }]
    },
    "extensions": {
        "type": "READ_ONLY",
        "operationName": "PushToPushLifecycle",
        "team_id": "T02FL4A1X",
        "team_name": "Cloud Foundry",
        "correlation_id": "c4186758-e47f-4069-bccd-a555380d46cd"
    }
}`;
    /* tslint:enable */

    it("correctly filter pushes on excluded branch", done => {
        class MockMessageClient extends MessageClientSupport {

            protected doSend(msg: string | SlackMessage, userNames: string | string[],
                             channelNames: string | string[], options?: MessageOptions): Promise<any> {
                assert(channelNames[0] === "some-channel2");
                return Promise.resolve();
            }
        }

        const ctx: any = {
            teamId: "T095SFFBK",
            correlationId: "14340b3c-e5bc-4101-9b0a-24cb69fc6bb9",
            invocationId: guid(),
            graphClient: {
                executeQueryFromFile(name: string, variables?: any): Promise<any> {
                    return Promise.resolve();
                },
            },
            messageClient: new MockMessageClient(),
        };
        const handler = new PushToPushLifecycle();
        const config = `\\"exclude\\":\\"^m.*r$\\"`;

        handler.handle(JSON.parse(payload.replace("%%CONFIG%%", config)) as EventFired<any>, ctx as HandlerContext)
            .then(result => {
                assert(result.code === 0);
            })
            .then(done, done);

    });

    it("correctly show pushes on included but also excluded branch", done => {
        class MockMessageClient extends MessageClientSupport {

            public counter = 0;

            protected doSend(msg: string | SlackMessage, userNames: string | string[],
                             channelNames: string | string[], options?: MessageOptions): Promise<any> {
                assert(channelNames.length === 3);
                this.counter++;
                return Promise.resolve();
            }
        }

        const ctx: any = {
            teamId: "T095SFFBK",
            correlationId: "14340b3c-e5bc-4101-9b0a-24cb69fc6bb9",
            invocationId: guid(),
            graphClient: {
                executeQueryFromFile(name: string, variables?: any): Promise<any> {
                    return Promise.resolve();
                },
            },
            messageClient: new MockMessageClient(),
        };
        const handler = new PushToPushLifecycle();
        const config = `\\"include\\":\\"^m.*r$\\", \\"exclude\\":\\"^m.*r$\\"`;

        handler.handle(JSON.parse(payload.replace("%%CONFIG%%", config)) as EventFired<any>, ctx as HandlerContext)
            .then(result => {
                assert(result.code === 0);
                assert(ctx.messageClient.counter === 1);
            })
            .then(done, done);

    });

    it("correctly filter pushes that aren't included", done => {
        class MockMessageClient extends MessageClientSupport {

            protected doSend(msg: string | SlackMessage, userNames: string | string[],
                             channelNames: string | string[], options?: MessageOptions): Promise<any> {
                assert(channelNames[0] === "some-channel2");
                return Promise.resolve();
            }
        }

        const ctx: any = {
            teamId: "T095SFFBK",
            correlationId: "14340b3c-e5bc-4101-9b0a-24cb69fc6bb9",
            invocationId: guid(),
            graphClient: {
                executeQueryFromFile(name: string, variables?: any): Promise<any> {
                    return Promise.resolve();
                },
            },
            messageClient: new MockMessageClient(),
        };
        const handler = new PushToPushLifecycle();
        const config = `\\"include\\":\\"^feat-.*$\\"`;

        handler.handle(JSON.parse(payload.replace("%%CONFIG%%", config)) as EventFired<any>, ctx as HandlerContext)
            .then(result => {
                assert(result.code === 0);
            })
            .then(done, done);
    });

    const payloadWithPr = `
    {
    "data": {
        "Push": [{
            "_id": 23016,
            "builds": [],
            "before": {
                "sha": "ba57020ea5e556305204c4e898e9860dfa7d3807"
            },
            "after": {
                "sha": "9298add8d10bb6c9e678e759452c6a220d858d33",
                "message": "Update README.md",
                "statuses": [],
                "tags": []
            },
            "repo": {
                "owner": "atomisthqa",
                "name": "handlers",
                "channels": [ {
                    "name": "handlers"
                }],
                "labels": [{
                    "name": "wontfix"
                }, {
                    "name": "duplicate"
                }, {
                    "name": "enhancement"
                }, {
                    "name": "feature"
                }, {
                    "name": "invalid"
                }, {
                    "name": "label with spaces"
                }, {
                    "name": "question"
                }, {
                    "name": "test"
                }, {
                    "name": "testylabel"
                }, {
                    "name": "UX"
                }, {
                    "name": "help wanted"
                }, {
                    "name": "bug"
                }, {
                    "name": "duplicate"
                }, {
                    "name": "bug"
                }, {
                    "name": "enhancement"
                }, {
                    "name": "wontfix"
                }, {
                    "name": "invalid"
                }, {
                    "name": "help wanted"
                }, {
                    "name": "test"
                }, {
                    "name": "label"
                }, {
                    "name": "label with spaces"
                }, {
                    "name": "question"
                }, {
                    "name": "UX"
                }],
                "org": {
                    "provider": null,
                    "chatTeam": {}
                },
                "defaultBranch": "master"
            },
            "commits": [{
                "sha": "9298add8d10bb6c9e678e759452c6a220d858d33",
                "message": "Update README.md",
                "resolves": [],
                "impact": null,
                "apps": [],
                "tags": [],
                "author": {
                    "login": "cdupuis",
                    "person": {
                        "chatId": {
                            "screenName": "cd"
                        }
                    }
                },
                "timestamp": "2017-10-23T09:40:18Z"
            }],
            "timestamp": "2017-10-23T09:40:20.003Z",
            "branch": "cdupuis-patch-37"
        }]
    },
    "extensions": {
        "type": "READ_ONLY",
        "operationName": "PushToPushLifecycle",
        "team_id": "T1L0VDKJP",
        "team_name": "atomista",
        "correlation_id": "e7e21121-7189-457a-8319-2d33cac5e681"
    }
}
    `;

    it("display referenced PR", done => {
        class MockMessageClient extends MessageClientSupport {

            protected doSend(msg: string | SlackMessage, userNames: string | string[],
                             channelNames: string | string[], options?: MessageOptions): Promise<any> {
                assert(channelNames[0] === "handlers");
                const sm = msg as SlackMessage;
                assert(sm.attachments[1].author_name === "#128: Simplify filter. Add a note");
                return Promise.resolve();
            }
        }

        const ctx: any = {
            teamId: "T095SFFBK",
            correlationId: "14340b3c-e5bc-4101-9b0a-24cb69fc6bb9",
            invocationId: guid(),
            graphClient: {
                executeQueryFromFile(name: string, variables?: any): Promise<any> {
                    assert(variables.branch === "cdupuis-patch-37");
                    return Promise.resolve({
                        Repo: [
                            {
                                name: "handlers",
                                branches: [
                                    {
                                        name: "cdupuis-patch-37",
                                        pullRequests: [
                                            {
                                                state: "open",
                                                number: 128,
                                                title: "Simplify filter. Add a note",
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    });
                },
            },
            messageClient: new MockMessageClient(),
        };
        const handler = new PushToPushLifecycle();

        handler.handle(JSON.parse(payloadWithPr) as EventFired<any>, ctx as HandlerContext)
            .then(result => {
                assert(result.code === 0);
            })
            .then(done, done);
    });

    const payloadCF = `
    {
  "data": {
    "Push": [{
      "_id": 1119493,
      "after": {
        "message": "Update package specs\\n\\nSigned-off-by: Andrew Poydence <apoydence@pivotal.io>",
        "sha": "cacbbdd1f0669434fe02b5e61cc673e049e6bac3",
        "statuses": [],
        "tags": []
      },
      "before": {
        "sha": "2dbdddd08b1ce063aab3a4e6bc15b5354afadbb0"
      },
      "branch": "master",
      "builds": [],
      "commits": [{
        "apps": [],
        "author": {
          "login": "bradylove",
          "person": {
            "chatId": {
              "screenName": "blove"
            }
          }
        },
        "impact": null,
        "message": "Update package specs\\n\\nSigned-off-by: Andrew Poydence <apoydence@pivotal.io>",
        "resolves": [],
        "sha": "cacbbdd1f0669434fe02b5e61cc673e049e6bac3",
        "tags": [],
        "timestamp": "2017-12-20T15:34:31-07:00"
      }],
      "repo": {
        "channels": [{
          "name": "loggregator"
        }],
        "defaultBranch": "master",
        "labels": [{
          "name": "good first issue"
        }, {
          "name": "wontfix"
        }, {
          "name": "help wanted"
        }, {
          "name": "invalid"
        }, {
          "name": "question"
        }, {
          "name": "bug"
        }, {
          "name": "duplicate"
        }, {
          "name": "enhancement"
        }],
        "name": "logging-acceptance-tests-release",
        "org": {
          "chatTeam": {
            "preferences": [{
              "name": "lifecycles",
              "value": "{\\"D89FP2CFK\\":{\\"push\\":false},\\"loggregator\\":{\\"push\\":false}}"
            }, {
              "name": "disable_bot_owner_on_github_activity_notification",
              "value": "true"
            }]
          },
          "provider": null
        },
        "owner": "cloudfoundry"
      },
      "timestamp": "2017-12-20T22:34:36.843Z"
    }]
  },
  "extensions": {
    "operationName": "PushToPushLifecycle",
    "team_id": "T02FL4A1X",
    "team_name": "Cloud Foundry",
    "correlation_id": "2045ed0e-ecd9-42a1-9f75-64a9b4780310"
  },
  "secrets": [{
    "name": "github://org_token",
    "value": "f**************************************6"
  }]
}`;

    it("don't display push rendering", done => {
        class MockMessageClient extends MessageClientSupport {

            protected doSend(msg: string | SlackMessage, userNames: string | string[],
                             channelNames: string | string[], options?: MessageOptions): Promise<any> {
                assert(channelNames.length === 1);
                assert(channelNames[0] === "atomist://dashboard");
                return Promise.resolve();
            }
        }

        const ctx: any = {
            teamId: "T095SFFBK",
            correlationId: "14340b3c-e5bc-4101-9b0a-24cb69fc6bb9",
            invocationId: guid(),
            graphClient: {
                executeQueryFromFile(name: string, variables?: any): Promise<any> {
                    assert(variables.branchName === "cdupuis-patch-37");
                    return Promise.resolve({
                        Repo: [
                            {
                                name: "handlers",
                                branches: [
                                    {
                                        name: "cdupuis-patch-37",
                                        pullRequests: [
                                            {
                                                state: "open",
                                                number: 128,
                                                title: "Simplify filter. Add a note",
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    });
                },
            },
            messageClient: new MockMessageClient(),
        };
        const handler = new PushToPushLifecycle();

        handler.handle(JSON.parse(payloadCF) as EventFired<any>, ctx as HandlerContext)
            .then(result => {
                assert(result.code === 0);
            })
            .then(done, done);
    });

});
