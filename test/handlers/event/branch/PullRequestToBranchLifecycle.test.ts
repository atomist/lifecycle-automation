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
import { MessageClientSupport } from "@atomist/automation-client/lib/spi/message/MessageClientSupport";
import { SlackMessage } from "@atomist/slack-messages";
import "mocha";
import * as assert from "power-assert";
import { pullRequestToBranchLifecycle } from "../../../../lib/handlers/event/branch/PullRequestToBranchLifecycle";
import { DefaultGitHubLifecycleOptions } from "../../../../lib/machine/githubLifecycleSupport";

describe("PullRequestToBranchLifecycle", () => {

    /* tslint:disable */
    const payload = `
    {
    "data": {
        "PullRequest": [{
            "branch": {
                "id": "T1L0VDKJP_github.com_atomisthqa_handlers_cd-branch-4"
            },
            "repo": {
                "name": "handlers",
                "org": {
                    "chatTeam": {
                        "preferences": [{
                            "name": "lifecycle_actions",
                            "value": "{\\"handlers\\":{\\"push\\":{\\"restart_build\\":true,\\"tag\\":true,\\"raise_pullrequest\\":true,\\"new_tag\\":true},\\"issue\\":{\\"assign\\":true}},\\"ddmvc1\\":{\\"push\\":{\\"new_tag\\":true},\\"branch\\":{\\"raise_pullrequest\\":true}},\\"demo-service\\":{\\"push\\":{\\"new_tag\\":true,\\"tag\\":true}},\\"banana\\":{\\"push\\":{\\"release\\":false,\\"tag\\":true}}}"
                        }, {
                            "name": "graphs",
                            "value": "rock"
                        }, {
                            "name": "lifecycle_preferences",
                            "value": "{\\"push\\":{\\"configuration\\":{\\"emoji-style\\":\\"atomist\\",\\"show-statuses-on-push\\":true,\\"build\\":{\\"style\\":\\"decorator\\"},\\"fingerprints\\":{\\"about-hint\\":false,\\"render-unchanged\\":true,\\"style\\":\\"fingerprint-inline\\"}}}}"
                        }, {
                            "name": "atomist:fingerprints:clojure:project-deps",
                            "value": "{\\"clj-config\\":\\"13.1.1-20170602194707\\",\\"kafka-lib\\":\\"4.0.1\\",\\"clj-git-lib\\":\\"0.2.10\\",\\"cheshire\\":\\"5.4.8\\",\\"clj-utils\\":\\"0.0.8\\"}"
                        }, {
                            "name": "test",
                            "value": "true"
                        }, {
                            "name": "lifecycle_renderers",
                            "value": "{\\"handlers\\":{\\"push\\":{\\"workflow\\":false}}}"
                        }, {
                            "name": "lifecycles",
                            "value": "{\\"handlers\\":{\\"push\\":true,\\"review\\":true,\\"issue\\":true,\\"branch\\":true},\\"kipz-test\\":{\\"review\\":true},\\"demo-service\\":{\\"branch\\":true}}"
                        }, {
                            "name": "disable_bot_owner_on_github_activity_notification",
                            "value": "true"
                        }]
                    }
                },
                "owner": "atomisthqa"
            }
        }]
    },
    "extensions": {
        "operationName": "PullRequestToBranchLifecycle",
        "team_id": "T1L0VDKJP",
        "team_name": "atomista",
        "correlation_id": "d482764c-7745-49b9-8596-f75edadf048c"
    }
}`;

    const queryResponse = `
    {
    "Branch": [{
        "id": "T1L0VDKJP_github.com_atomisthqa_handlers_cd-branch-4",
        "pullRequests": [{
            "merged": false
        }],
        "commit": {
            "sha": "886f0a7d3920cefcd599a3e92aa0cd7155c19cd1",
            "message": "Update README.md"
        },
        "name": "cd-branch-4",
        "repo": {
            "name": "handlers",
            "owner": "atomisthqa",
            "defaultBranch": "master",
            "channels": [{
                "name": "handlers",
                "team": {
                  "id": "T1L0VDKJP"
                }
            }],
            "org": {
               "team": {
                    "id": "T1L0VDKJP",
                    "chatTeams": [{
                        "id": "T1L0VDKJP",
                        "preferences": [{
                            "name": "lifecycle_actions",
                            "value": "{\\"handlers\\":{\\"push\\":{\\"restart_build\\":true,\\"tag\\":true,\\"raise_pullrequest\\":true,\\"new_tag\\":true},\\"issue\\":{\\"assign\\":true}},\\"ddmvc1\\":{\\"push\\":{\\"new_tag\\":true},\\"branch\\":{\\"raise_pullrequest\\":true}},\\"demo-service\\":{\\"push\\":{\\"new_tag\\":true,\\"tag\\":true}},\\"banana\\":{\\"push\\":{\\"release\\":false,\\"tag\\":true}}}"
                        }, {
                            "name": "graphs",
                            "value": "rock"
                        }, {
                            "name": "lifecycle_preferences",
                            "value": "{\\"push\\":{\\"configuration\\":{\\"emoji-style\\":\\"atomist\\",\\"show-statuses-on-push\\":true,\\"build\\":{\\"style\\":\\"decorator\\"},\\"fingerprints\\":{\\"about-hint\\":false,\\"render-unchanged\\":true,\\"style\\":\\"fingerprint-inline\\"}}}}"
                        }, {
                            "name": "atomist:fingerprints:clojure:project-deps",
                            "value": "{\\"clj-config\\":\\"13.1.1-20170602194707\\",\\"kafka-lib\\":\\"4.0.1\\",\\"clj-git-lib\\":\\"0.2.10\\",\\"cheshire\\":\\"5.4.8\\",\\"clj-utils\\":\\"0.0.8\\"}"
                        }, {
                            "name": "test",
                            "value": "true"
                        }, {
                            "name": "lifecycle_renderers",
                            "value": "{\\"handlers\\":{\\"push\\":{\\"workflow\\":false}}}"
                        }, {
                            "name": "lifecycles",
                            "value": "{\\"handlers\\":{\\"push\\":true,\\"review\\":true,\\"issue\\":true,\\"branch\\":true},\\"kipz-test\\":{\\"review\\":true},\\"demo-service\\":{\\"branch\\":true}}"
                        }, {
                            "name": "disable_bot_owner_on_github_activity_notification",
                            "value": "true"
                        }]
                    }]
                },
                "provider": {
                    "providerType": "github_com"
                }
            }
        },
        "timestamp": "2017-12-21T13:15:10.685Z"
    }]
}`;
    /* tslint:enable */

    it("display a branch message", done => {
        let messageSent = false;
        class MockMessageClient extends MessageClientSupport {

            protected doSend(msg: any, destinations: Destination[], options?: MessageOptions): Promise<any> {
                assert((destinations[0] as SlackDestination).channels[0] === "handlers");
                assert(options.id === "branch_lifecycle/atomisthqa/handlers/cd-branch-4");
                const sm = msg as SlackMessage;
                assert(sm.text === null);
                assert(sm.attachments.length === 1);
                assert(sm.attachments[0].actions.length === 0);
                messageSent = true;
                return Promise.resolve();
            }
        }

        const ctx: any = {
            messageClient: new MockMessageClient(),
            graphClient: {
                query() {
                    /* tslint:disable */
                    return Promise.resolve(JSON.parse(queryResponse));
                    /* tslint:enable */
                },
            },
            context: {
                team_name: "atomista",
            },
        };
        const handler = pullRequestToBranchLifecycle(DefaultGitHubLifecycleOptions.branch.chat).listener;

        handler(JSON.parse(payload) as EventFired<any>, ctx as HandlerContext, {})
            .then(result => {
                assert(messageSent);
                assert(result.code === 0);
            })
            .then(done, done);

    });

});
