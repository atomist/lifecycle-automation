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
    buildIngester,
    buildType,
    IngesterBuilder,
} from "@atomist/automation-client/ingesters";

export interface IssueRelationship {
    relationshipId: string;
    type: "related";
    state: "open" | "closed";
    source: {
        owner: string;
        repo: string;
        issue: string;
    };
    target: {
        owner: string;
        repo: string;
        issue: string;
    };
}

export const issueRelationshipIngester: IngesterBuilder = buildIngester("IssueRelationship")
    .withType(buildType("IssueRelationshipIssue")
        .withStringField("owner")
        .withStringField("repo")
        .withStringField("issue"))
    .withType(buildType("IssueRelationship")
        .withStringField(
            "relationshipId",
            "Unique id of the issue relationship",
            ["compositeId"])
        .withStringField("type")
        .withStringField("state")
        .withObjectField(
            "source",
            "IssueRelationshipIssue",
            "The source issue of the relationship",
            ["owner", "repo", "issue"])
        .withObjectField(
            "target",
            "IssueRelationshipIssue",
            "The target issue of the relationship",
            ["owner", "repo", "issue"]));
