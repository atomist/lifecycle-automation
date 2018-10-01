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
import {
    BlackDuckFingerprintNodeRenderer,
} from "../../../../../src/handlers/event/push/rendering/PushNodeRenderers";
import * as graphql from "../../../../../src/typings/types";

describe("BlackDuckFingerprintNodeRenderer", () => {

    /* tslint:disable */
    const noFingerprint = `{
	"after": {
		"fingerprints": [],
		"images": [],
		"message": "Update README.md",
		"statuses": [],
		"tags": []
	},
	"branch": "master",
	"builds": [],
	"commits": [{
		"apps": [],
		"author": {
			"login": "claymccoy",
			"person": {
				"chatId": {
					"screenName": "clay"
				}
			}
		},
		"message": "Update README.md",
		"resolves": [],
		"tags": [],
		"timestamp": "2018-02-19T09:41:15-06:00"
	}],
	"repo": {
		"channels": [],
		"defaultBranch": "master",
		"labels": [],
		"name": "GradleBlackDuckTest",
		"org": {
			"provider": {
				"apiUrl": "https://api.github.com/",
				"gitUrl": "git@github.com:",
				"url": "https://github.com/"
			}
		},
		"owner": "atomisthq"
	},
	"timestamp": "2018-02-19T15:41:17.009Z"
}`;
    /* tslint:enable */

    it("should pass through with no fingerprints", () => {
        const push = JSON.parse(noFingerprint) as graphql.PushToPushLifecycle.Push;
        const renderer = new BlackDuckFingerprintNodeRenderer();
        assert(!renderer.supports(push));
    });

    /* tslint:disable */
    const riskProfileFingerprint = `{
	"after": {
		"fingerprints": [{
		        "data": "{\\"categories\\": {\\"VULNERABILITY\\": {\\"HIGH\\": 1,\\"MEDIUM\\": 2,\\"LOW\\": 3}},\\"_meta\\": {\\"allow\\": [\\"GET\\"],\\"href\\": \\"https://blackduckhub.com/api/projects/123/versions/456/risk-profile\\"}}",
				"name": "BlackDuckRiskProfile",
				"sha": ""
			}
		],
        "statuses": [
          {
            "context": "black-duck/hub-detect",
            "description": "Ran Black Duck Hub Detect",
            "state": "success",
            "targetUrl": "https://blackduckhub.com"
          }
        ],
		"images": [],
		"message": "Update README.md",
		"tags": []
	},
	"branch": "master",
	"builds": [],
	"commits": [{
		"apps": [],
		"author": {
			"login": "claymccoy",
			"person": {
				"chatId": {
					"screenName": "clay"
				}
			}
		},
		"message": "Update README.md",
		"resolves": [],
		"tags": [],
		"timestamp": "2018-02-19T09:41:15-06:00"
	}],
	"repo": {
		"channels": [],
		"defaultBranch": "master",
		"labels": [],
		"name": "GradleBlackDuckTest",
		"org": {
			"provider": {
				"apiUrl": "https://api.github.com/",
				"gitUrl": "git@github.com:",
				"url": "https://github.com/"
			}
		},
		"owner": "atomisthq"
	},
	"timestamp": "2018-02-19T15:41:17.009Z"
}`;
    /* tslint:enable */

    it("should render risk profile fingerprint", done => {
        const push = JSON.parse(riskProfileFingerprint) as graphql.PushToPushLifecycle.Push;
        const renderer = new BlackDuckFingerprintNodeRenderer();
        assert(renderer.supports(push));
        renderer.render(push, [], {attachments: []}, undefined).then(msg => {
            const expected = [
                {
                    actions: [],
                    author_icon: "https://images.atomist.com/rug/blackduck.jpg",
                    author_name: "Black Duck",
                    author_link: "https://blackduckhub.com/ui/versions/id:456/view:bom",
                    fallback: "Security Risks - 1 High, 2 Medium, 3 Low",
                    mrkdwn_in: [
                        "text",
                    ],
                    text: "Security Risks - 1 High, 2 Medium, 3 Low",
                },
            ];
            assert.deepEqual(msg.attachments, expected);
        })
        .then(done, done);
    });

});
