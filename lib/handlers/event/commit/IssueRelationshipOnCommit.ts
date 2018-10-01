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
    EventFired,
    EventHandler,
    HandleEvent,
    HandlerContext,
    HandlerResult,
    SuccessPromise,
} from "@atomist/automation-client";
import { subscription } from "@atomist/automation-client/graph/graphQL";
import { addressEvent } from "@atomist/automation-client/spi/message/MessageClient";
import {
    CommitIssueRelationship,
    CommitIssueRelationshipRootType,
} from "../../../ingesters/commitIssueRelationship";
import * as graphql from "../../../typings/types";
import { extractLinkedIssues } from "../../../util/helpers";

@EventHandler("Create a relationship between a commit and issue/PR",
    subscription("issueRelationshipOnCommit"))
export class IssueRelationshipOnCommit implements HandleEvent<graphql.IssueRelationshipOnCommit.Subscription> {

    public async handle(e: EventFired<graphql.IssueRelationshipOnCommit.Subscription>,
                        ctx: HandlerContext): Promise<HandlerResult> {
        const commit = e.data.Commit[0];

        const issues = await extractLinkedIssues(commit.message, commit.repo, [], ctx);

        if (issues) {
            for (const issue of issues.issues) {
                await this.storeCommitIssueRelationship(commit, issue, ctx);
            }
            for (const pr of issues.prs) {
                await this.storeCommitIssueRelationship(commit, pr, ctx);
            }
        }

        return SuccessPromise;
    }

    private async storeCommitIssueRelationship(commit, issue, ctx: HandlerContext) {
        const referencedIssue: CommitIssueRelationship = {
            commit: {
                owner: commit.repo.owner,
                repo: commit.repo.name,
                sha: commit.sha,
            },
            issue: {
                name: issue.name,
                owner: issue.repo.owner,
                repo: issue.repo.name,
            },
            type: "references",
        };
        await ctx.messageClient.send(referencedIssue, addressEvent(CommitIssueRelationshipRootType));
    }
}
