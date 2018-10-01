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
    failure,
    HandleEvent,
    HandlerContext,
    HandlerResult,
    Secret,
    Secrets,
    success,
    Success,
    Tags,
} from "@atomist/automation-client";
import { subscription } from "@atomist/automation-client/graph/graphQL";
import { QueryNoCacheOptions } from "@atomist/automation-client/spi/graph/GraphClient";
import { addressEvent } from "@atomist/automation-client/spi/message/MessageClient";
import * as _ from "lodash";
import * as graphql from "../../../typings/types";
import { AtomistGeneratedLabel } from "../../../util/helpers";
import * as github from "../../command/github/gitHubApi";

const RelatedIssueQuery = `query RelatedIssue($owner: [String]!, $repo: [String]!, $issue: [String]!) {
  IssueRelationship(state: ["open"], type: ["related"]) {
    relationshipId
    type
    state
    source {
      owner
      repo
      issue
    }
    target(owner: $owner, repo: $repo, issue: $issue) {
      owner
      repo
      issue
    }
  }
}
`;

/**
 * Create a comment if a related issue is closed.
 */
@EventHandler("Create a comment if a related issue is closed", subscription("commentOnRelatedIssueClosed"))
@Tags("lifecycle", "issue")
export class CommentOnRelatedIssueClosed
    implements HandleEvent<graphql.CommentOnRelatedIssueClosed.Subscription> {

    @Secret(Secrets.OrgToken)
    public orgToken: string;

    public handle(event: EventFired<graphql.CommentOnRelatedIssueClosed.Subscription>,
                  ctx: HandlerContext): Promise<HandlerResult> {
        const issue = event.data.Issue[0];

        return ctx.graphClient.query<any, any>({
                query: RelatedIssueQuery,
                variables: {
                    owner: [issue.repo.owner],
                    repo: [issue.repo.name],
                    issue: [issue.number.toString()],
                },
                options: QueryNoCacheOptions,
        })
        .then(result => {
            if (result
                && result.IssueRelationship
                && result.IssueRelationship.length > 0) {

                const api = github.api(this.orgToken);

                return Promise.all(result.IssueRelationship.map(ir => {
                    return api.issues.createComment({
                        owner: ir.source.owner,
                        repo: ir.source.repo,
                        number: ir.source.issue,
                        body: `Related issue ${ir.target.owner}/${ir.target.repo}#${
                            ir.target.issue} closed by @${issue.closedBy.login}

[${AtomistGeneratedLabel}] [atomist:related-issue]`,
                    })
                    .then(() => {
                        const issueRel = _.cloneDeep(ir);
                        issueRel.state = "closed";
                        return ctx.messageClient.send(issueRel, addressEvent("IssueRelationship"));
                    });
                }))
                .then(success);
            }
            return Success;
        })
        .then(success, failure);
    }
}
