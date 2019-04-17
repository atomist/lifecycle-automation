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
    HandlerContext,
    MessageOptions,
    SlackDestination,
} from "@atomist/automation-client";
import "mocha";
import * as assert from "power-assert";
import { notifyReviewerOnPush } from "../../../../lib/handlers/event/push/NotifyReviewerOnPush";

describe("NotifyReviewerOnPush", () => {

    /* tslint:disable */
    const payload1= `
    {
  "data": {
    "Push": [{
      "branch": "atomist-travisorg-patch-3",
      "repo": {
        "name": "handlers",
        "owner": "atomisthqa",
        "org": {
          "owner": "atomisthqa",
          "provider": {
            "providerType": "github_com"
          }
        }
      },
      "commits": [{
        "author": {
          "login": "atomist-travisorg"
        },
        "sha": "815c9e15134c761e0febe1a8222f3cb53dd22d13",
        "pullRequests": [{
          "author": {
            "login": "atomist-travisorg"
          },
          "name": "1186",
          "number": 1186,
          "title": "Update README.md",
          "body": "",
          "state": "open",
          "merged": false,
          "reviewers": [{
            "login": "cdupuis"
          }],            
          "reviews": [{
            "state": "changes_requested",
            "by": [{
              "login": "cdupuis",
              "person": {
                "chatId": {
                  "screenName": "atomista",
                  "preferences": [{
                    "name": "dm",
                    "value": "{\\"disable_for_build\\":false,\\"disable_for_assignee\\":false,\\"disable_for_mention\\":false,\\"disable_for_prUpdates\\":false}"
                  }],
                  "chatTeam": {
                    "id": "T1L0VDKJP"
                  }
                }
              }
            }]
          }]
        }]
      }]
    }]
  },
  "extensions": {
    "type": "READ_ONLY",
    "operationName": "NotifyReviewerOnPush",
    "team_id": "T1L0VDKJP",
    "team_name": "atomista",
    "correlation_id": "a9187300-bc60-41bd-9801-ab2a284e4313"
  }
}`
    /* tslint:enable */

    it("correctly send message to reviewer on new commit", done => {
        let messageSend = false;
        class MockMessageClient {

            public send(msg: any, destinations: Destination, options?: MessageOptions): Promise<any> {
                assert((destinations as SlackDestination).users[0] === "atomista");
                messageSend = true;
                return Promise.resolve();
            }

        }

        const ctx: any = {
            messageClient: new MockMessageClient(),
        };
        const handler = notifyReviewerOnPush().listener;

        handler(JSON.parse(payload1) as EventFired<any>, ctx as HandlerContext, {})
            .then(result => {
                assert(messageSend);
                assert(result.code === 0);
            })
            .then(done, done);

    });

    /* tslint:disable */
    const payload11 = `
    {
  "data": {
    "Push": [{
      "branch": "atomist-travisorg-patch-3",
      "repo": {
        "name": "handlers",
        "owner": "atomisthqa",
        "org": {
          "owner": "atomisthqa",
          "provider": null
        }
      },
      "commits": [{
        "author": {
          "login": "atomist-travisorg"
        },
        "sha": "815c9e15134c761e0febe1a8222f3cb53dd22d13",
        "pullRequests": [{
          "author": {
            "login": "atomist-travisorg"
          },
          "name": "1186",
          "number": 1186,
          "title": "Update README.md",
          "body": "",
          "state": "open",
          "merged": false,
          "reviewers": [],            
          "reviews": [{
            "state": "commented",
            "by": [{
              "login": "cdupuis",
              "person": {
                "chatId": {
                  "screenName": "atomista",
                  "preferences": [{
                    "name": "dm",
                    "value": "{\\"disable_for_build\\":false,\\"disable_for_assignee\\":false,\\"disable_for_mention\\":false,\\"disable_for_prUpdates\\":false}"
                  }]
                }
              }
            }]
          }]
        }]
      }]
    }]
  },
  "extensions": {
    "type": "READ_ONLY",
    "operationName": "NotifyReviewerOnPush",
    "team_id": "T1L0VDKJP",
    "team_name": "atomista",
    "correlation_id": "a9187300-bc60-41bd-9801-ab2a284e4313"
  }
}`
    /* tslint:enable */

    it("correctly don't send message to reviewer commented on new commit", done => {
        let messageSend = false;
        class MockMessageClient {

            public send(msg: any, destinations: Destination, options?: MessageOptions): Promise<any> {
                assert((destinations as SlackDestination).users[0] === "atomista");
                messageSend = true;
                return Promise.resolve();
            }

        }

        const ctx: any = {
            messageClient: new MockMessageClient(),
        };
        const handler = notifyReviewerOnPush().listener;

        handler(JSON.parse(payload11) as EventFired<any>, ctx as HandlerContext, {})
            .then(result => {
                assert(!messageSend);
                assert(result.code === 0);
            })
            .then(done, done);

    });

    /* tslint:disable */
    const payload2 = `
    {
  "data": {
    "Push": [{
      "branch": "atomist-travisorg-patch-3",
      "repo": {
        "name": "handlers",
        "owner": "atomisthqa",
        "org": {
          "owner": "atomisthqa",
          "provider": null
        }
      },
      "commits": [{
        "author": {
          "login": "atomist-travisorg"
        },
        "sha": "815c9e15134c761e0febe1a8222f3cb53dd22d13",
        "pullRequests": [{
          "author": {
            "login": "atomist-travisorg"
          },
          "name": "1186",
          "number": 1186,
          "title": "Update README.md",
          "body": "",
          "state": "open",
          "merged": false,
          "reviews": [{
            "state": "requested",
            "by": [{
              "login": "cdupuis",
              "person": {
                "chatId": {
                  "screenName": "atomista",
                  "preferences": [{
                    "name": "dm",
                    "value": "{\\"disable_for_build\\":false,\\"disable_for_assignee\\":false,\\"disable_for_mention\\":false,\\"disable_for_prUpdates\\":false}"
                  }]
                }
              }
            }]
          }]
        }]
      }]
    }]
  },
  "extensions": {
    "type": "READ_ONLY",
    "operationName": "NotifyReviewerOnPush",
    "team_id": "T1L0VDKJP",
    "team_name": "atomista",
    "correlation_id": "a9187300-bc60-41bd-9801-ab2a284e4313"
  }
}`
    /* tslint:enable */

    it("don't send message to reviewer on new commit if review is requested", done => {
        class MockMessageClient {

            public send(msg: any, destinations: Destination, options?: MessageOptions): Promise<any> {
                return Promise.reject("Shouldn't be caled");
            }

        }

        const ctx: any = {
            messageClient: new MockMessageClient(),
        };
        const handler = notifyReviewerOnPush().listener;

        handler(JSON.parse(payload2) as EventFired<any>, ctx as HandlerContext, {})
            .then(result => {
                assert(result.code === 0);
            })
            .then(done, done);

    });

    /* tslint:disable */
    const payload3 = `
    {
  "data": {
    "Push": [{
      "branch": "atomist-travisorg-patch-3",
      "repo": {
        "name": "handlers",
        "owner": "atomisthqa",
        "org": {
          "owner": "atomisthqa",
          "provider": null
        }
      },
      "commits": [{
        "author": {
          "login": "atomist-travisorg"
        },
        "sha": "815c9e15134c761e0febe1a8222f3cb53dd22d13",
        "pullRequests": [{
          "author": {
            "login": "atomist-travisorg"
          },
          "name": "1186",
          "number": 1186,
          "title": "Update README.md",
          "body": "",
          "state": "open",
          "merged": false,
          "reviews": [{
            "state": "requested",
            "by": [{
              "login": "cdupuis",
              "person": {
                "chatId": {
                  "screenName": "atomista",
                  "preferences": [{
                    "name": "dm",
                    "value": "{\\"disable_for_build\\":false,\\"disable_for_assignee\\":false,\\"disable_for_mention\\":false,\\"disable_for_prUpdates\\":true}"
                  }]
                }
              }
            }]
          }]
        }]
      }]
    }]
  },
  "extensions": {
    "type": "READ_ONLY",
    "operationName": "NotifyReviewerOnPush",
    "team_id": "T1L0VDKJP",
    "team_name": "atomista",
    "correlation_id": "a9187300-bc60-41bd-9801-ab2a284e4313"
  }
}`
    /* tslint:enable */

    it("don't send message to reviewer on new commit if dm is disabled", done => {
        class MockMessageClient {

            public send(msg: any, destinations: Destination, options?: MessageOptions): Promise<any> {
                return Promise.reject("Shouldn't be called");
            }

        }

        const ctx: any = {
            messageClient: new MockMessageClient(),
        };
        const handler = notifyReviewerOnPush().listener;

        handler(JSON.parse(payload3) as EventFired<any>, ctx as HandlerContext, {})
            .then(result => {
                assert(result.code === 0);
            })
            .then(done, done);

    });

});
