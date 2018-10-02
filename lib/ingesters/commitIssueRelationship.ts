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
    buildEnum,
    buildIngester,
    buildType,
    IngesterBuilder,
} from "@atomist/automation-client/ingesters";

export const CommitIssueRelationshipRootType = "CommitIssueRelationship";

export interface CommitIssueRelationship {
    type: "fixes" | "references";
    commit: {
        sha: string;
        owner: string;
        repo: string;
    };
    issue: {
        owner: string;
        repo: string;
        name: string;
    };
}

export const commitIssueRelationshipIngester: IngesterBuilder = buildIngester(CommitIssueRelationshipRootType)
    .withType(buildType("CommitIssueRelationshipIssue")
        .withStringField("owner", "", ["compositeId"])
        .withStringField("repo", "", ["compositeId"])
        .withStringField("name", "", ["compositeId"]))
    .withType(buildType("CommitIssueRelationshipCommit")
        .withStringField("owner", "", ["compositeId"])
        .withStringField("repo", "", ["compositeId"])
        .withStringField("sha", "", ["compositeId"]))
    .withEnum(buildEnum("CommitIssueRelationshipType", ["fixes", "references"]))
    .withType(buildType("CommitIssueRelationship")
        .withEnumField("type", "CommitIssueRelationshipType")
        .withObjectField(
            "commit",
            "CommitIssueRelationshipCommit",
            "The commit that references the issue",
            ["owner", "repo", "sha"])
        .withObjectField(
            "issue",
            "CommitIssueRelationshipIssue",
            "The target issue of the relationship",
            ["owner", "repo", "name"]));
