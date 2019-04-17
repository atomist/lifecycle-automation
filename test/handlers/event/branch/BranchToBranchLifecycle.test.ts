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

import {
    Destination,
    EventFired,
    guid,
    HandlerContext,
    MessageOptions,
    SlackDestination,
} from "@atomist/automation-client";
import {
    DefaultSlackMessageClient,
    MessageClientSupport,
} from "@atomist/automation-client/lib/spi/message/MessageClientSupport";
import { SlackMessage } from "@atomist/slack-messages";
import "mocha";
import * as assert from "power-assert";
import { branchToBranchLifecycle } from "../../../../lib/handlers/event/branch/BranchToBranchLifecycle";
import { DefaultLifecycleOptions } from "../../../../lib/machine/lifecycleSupport";

describe("BranchToBranchLifecycle", () => {

    /* tslint:disable */
    const payload = `{
    "data": {
        "Branch": [{
            "name": "master",
            "repo": {
                "name": "ddmvc1",
                "owner": "atomisthqa",
                "defaultBranch": "master",
                "channels": [{
                    "name": "ddmvc1",
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
                                "value": "{\\"handlers\\":{\\"push\\":{\\"restart_build\\":true,\\"tag\\":true,\\"raise_pullrequest\\":true},\\"issue\\":{\\"assign\\":true}}}"
                            }, {
                                "name": "graphs",
                                "value": "rock"
                            }, {
                                "name": "lifecycle_preferences",
                                "value": "{\\"push\\":{\\"configuration\\":{\\"emoji-style\\":\\"atomist\\",\\"show-statuses-on-push\\":true,\\"build\\":{\\"style\\":\\"decorator\\"},\\"fingerprints\\":{\\"about-hint\\":false,\\"render-unchanged\\":true,\\"style\\":\\"fingerprint-inline\\"}}}}"
                            }, {
                                "name": "test",
                                "value": "true"
                            }, {
                                "name": "lifecycle_renderers",
                                "value": "{\\"handlers\\":{\\"push\\":{\\"workflow\\":false}}}"
                            }, {
                                "name": "lifecycles",
                                "value": "{\\"handlers\\":{\\"push\\":true,\\"review\\":true,\\"issue\\":true,\\"branch\\":true}}"
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
            "timestamp": "2017-11-28T12:26:08.008Z"
        }]
    },
    "extensions": {
        "type": "READ_ONLY",
        "operationName": "BranchToBranchLifecycle",
        "team_id": "T1L0VDKJP",
        "team_name": "atomista",
        "correlation_id": "2efa55de-f3d1-40ce-908f-857debbc40d3"
    },
    "secrets": [{
        "name": "github://org_token",
        "value": "5**************************************7"
    }]
}`;
    /* tslint:enable */

    it("don't display a branch created message for default or master branch", done => {
        class MockMessageClient extends MessageClientSupport {

            protected doSend(msg: any, destinations: Destination[], options?: MessageOptions): Promise<any> {
                assert((destinations[0] as SlackDestination).channels[0] === "ddmvc1");
                assert(options.id === "branch_lifecycle/atomisthqa/ddmvc1/master/false");
                const sm = msg as SlackMessage;
                assert(sm.text === null);
                assert(sm.attachments.length === 0);
                return Promise.resolve();
            }
        }

        const ctx: any = {
            messageClient: new DefaultSlackMessageClient(new MockMessageClient(), null),
        };
        const handler = branchToBranchLifecycle(DefaultLifecycleOptions.branch.chat).listener;

        handler(JSON.parse(payload) as EventFired<any>, ctx as HandlerContext, {})
            .then(result => {
                assert(result.code === 0);
            })
            .then(done, done);

    });

    /* tslint:disable */
    const payload1 = `{
    "data": {
        "Branch": [{
            "name": "some-feature",
            "commit": {
                "sha": "f94a69f1ce47f2862d3e34e6ec08c868bbfc4738",
                "message": "Delint"
            },
            "repo": {
                "name": "ddmvc1",
                "owner": "atomisthqa",
                "defaultBranch": "master",
                "channels": [{
                    "name": "ddmvc1",
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
                                "value": "{\\"ddmvc1\\":{\\"branch\\":{\\"raise_pullrequest\\":true},\\"issue\\":{\\"assign\\":true}}}"
                            }, {
                                "name": "graphs",
                                "value": "rock"
                            }, {
                                "name": "lifecycle_preferences",
                                "value": "{\\"push\\":{\\"configuration\\":{\\"emoji-style\\":\\"atomist\\",\\"show-statuses-on-push\\":true,\\"build\\":{\\"style\\":\\"decorator\\"},\\"fingerprints\\":{\\"about-hint\\":false,\\"render-unchanged\\":true,\\"style\\":\\"fingerprint-inline\\"}}}}"
                            }, {
                                "name": "test",
                                "value": "true"
                            }, {
                                "name": "lifecycle_renderers",
                                "value": "{\\"handlers\\":{\\"push\\":{\\"workflow\\":false}}}"
                            }, {
                                "name": "lifecycles",
                                "value": "{\\"ddmvc1\\":{\\"push\\":true,\\"review\\":true,\\"issue\\":true}}"
                            }, {
                                "name": "disable_bot_owner_on_github_activity_notification",
                                "value": "true"
                            }]
                        }]
                    },
                    "provider": {}
                }
            },
            "timestamp": "2017-11-28T12:26:08.008Z"
        }]
    },
    "extensions": {
        "type": "READ_ONLY",
        "operationName": "BranchToBranchLifecycle",
        "team_id": "T1L0VDKJP",
        "team_name": "atomista",
        "correlation_id": "2efa55de-f3d1-40ce-908f-857debbc40d3"
    },
    "secrets": [{
        "name": "github://org_token",
        "value": "5**************************************7"
    }]
}`;
    /* tslint:enable */

    it("don't display a branch created message when lifecycle is disabled", done => {
        let messageSent = false;
        class MockMessageClient extends MessageClientSupport {

            protected doSend(msg: any, destinations: Destination[], options?: MessageOptions): Promise<any> {
                messageSent = true;
                return Promise.resolve();
            }
        }

        const ctx: any = {
            invocationId: guid(),
            messageClient: new DefaultSlackMessageClient(new MockMessageClient(), null),
        };
        const handler = branchToBranchLifecycle(DefaultLifecycleOptions.branch.chat).listener;

        handler(JSON.parse(payload1) as EventFired<any>, ctx as HandlerContext, {})
            .then(result => {
                assert(!messageSent);
                assert(result.code === 0);
            })
            .then(done, done);

    });

    /* tslint:disable */
    const payload2 = `{
    "data": {
        "Branch": [{
            "name": "some-feature",
            "repo": {
                "name": "ddmvc1",
                "owner": "atomisthqa",
                "defaultBranch": "master",
                "channels": [{
                    "name": "ddmvc1",
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
                                "value": "{\\"handlers\\":{\\"push\\":{\\"restart_build\\":true,\\"tag\\":true,\\"raise_pullrequest\\":true},\\"issue\\":{\\"assign\\":true}}}"
                            }, {
                                "name": "graphs",
                                "value": "rock"
                            }, {
                                "name": "lifecycle_preferences",
                                "value": "{\\"push\\":{\\"configuration\\":{\\"emoji-style\\":\\"atomist\\",\\"show-statuses-on-push\\":true,\\"build\\":{\\"style\\":\\"decorator\\"},\\"fingerprints\\":{\\"about-hint\\":false,\\"render-unchanged\\":true,\\"style\\":\\"fingerprint-inline\\"}}}}"
                            }, {
                                "name": "test",
                                "value": "true"
                            }, {
                                "name": "lifecycle_renderers",
                                "value": "{\\"handlers\\":{\\"push\\":{\\"workflow\\":false}}}"
                            }, {
                                "name": "lifecycles",
                                "value": "{\\"ddmvc1\\":{\\"push\\":true,\\"review\\":true,\\"issue\\":true,\\"branch\\":true}}"
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
            "timestamp": "2017-11-28T12:26:08.008Z"
        }]
    },
    "extensions": {
        "type": "READ_ONLY",
        "operationName": "BranchToBranchLifecycle",
        "team_id": "T1L0VDKJP",
        "team_name": "atomista",
        "correlation_id": "2efa55de-f3d1-40ce-908f-857debbc40d3"
    },
    "secrets": [{
        "name": "github://org_token",
        "value": "5**************************************7"
    }]
}`;
    /* tslint:enable */

    it("display a branch message for branch", done => {
        let messageSent = false;
        class MockMessageClient extends MessageClientSupport {

            protected doSend(msg: any, destinations: Destination[], options?: MessageOptions): Promise<any> {
                assert((destinations[0] as SlackDestination).channels[0] === "ddmvc1");
                assert(options.id === "branch_lifecycle/atomisthqa/ddmvc1/some-feature");

                const sm = msg as SlackMessage;
                assert(sm.attachments.length === 1);
                assert(sm.attachments[0].text.indexOf("created") >= 0);
                assert(sm.attachments[0].actions.length === 0);
                messageSent = true;
                return Promise.resolve();
            }
        }

        const ctx: any = {
            invocationId: guid(),
            messageClient: new DefaultSlackMessageClient(new MockMessageClient(), null),
        };
        const handler = branchToBranchLifecycle(DefaultLifecycleOptions.branch.chat).listener;

        handler(JSON.parse(payload2) as EventFired<any>, ctx as HandlerContext, {})
            .then(result => {
                assert(messageSent);
                assert(result.code === 0);
            })
            .then(done, done);

    });

    /* tslint:disable */
    const payloadFailure =
        `{"data":{"Branch":[{"id":"T0434HFDT_github.release_branch_test","pullRequests":[],"commit":null,"name":"release_branch_test","deleted":true,"repo":{"name":"test","owner":"atomisthq","defaultBranch":"master","channels":[],"org":{"chatTeam":{"preferences":[{"name":"disable_bot_owner_on_github_activity_notification","value":"true"}]},"provider":{"private":false}}},"timestamp":"2017-12-05T22:09:00.084Z"}]},"extensions":{"type":"READ_ONLY","operationName":"BranchToBranchLifecycle","team_id":"T0434HFDT","team_name":"atomisthq","correlation_id":"057f722f-7de9-4e8a-b877-8713ff1e8004"},"secrets":[{"name":"github://org_token","value":"7**************************************3"}]}`
    /* tslint:enable */

    it("don't fail for null commit", done => {
        class MockMessageClient extends MessageClientSupport {

            protected doSend(msg: any, destinations: Destination[], options?: MessageOptions): Promise<any> {
                return Promise.resolve();
            }
        }

        const ctx: any = {
            invocationId: guid(),
            messageClient: new DefaultSlackMessageClient(new MockMessageClient(), null),
        };
        const handler = branchToBranchLifecycle(DefaultLifecycleOptions.branch.chat).listener;

        handler(JSON.parse(payloadFailure) as EventFired<any>, ctx as HandlerContext, {})
            .then(result => {
                assert(result.code === 0);
            })
            .then(done, done);

    });
});
