/*
 * Copyright © 2018 Atomist, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
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
    Tags,
} from "@atomist/automation-client";
import { subscription } from "@atomist/automation-client/graph/graphQL";
import * as _ from "lodash";
import { Preferences } from "../../../lifecycle/Lifecycle";
import { chatTeamsToPreferences } from "../../../lifecycle/util";
import * as graphql from "../../../typings/types";
import {
    IssueCardLifecycleHandler,
    IssueLifecycleHandler,
} from "./IssueLifecycle";

/**
 * Send a lifecycle message on Issue events.
 */
@EventHandler("Send a lifecycle message on Issue events", subscription("issueToIssue"))
@Tags("lifecycle", "issue")
export class IssueToIssueLifecycle extends IssueLifecycleHandler<graphql.IssueToIssueLifecycle.Subscription> {

    protected extractNodes(event: EventFired<graphql.IssueToIssueLifecycle.Subscription>):
        [graphql.IssueToIssueLifecycle.Issue,
            graphql.IssueFields.Repo, string] {

        const issue = event.data.Issue[0];
        const repo = event.data.Issue[0].repo;
        return [issue, repo, Date.now().toString()];
    }

    protected extractPreferences(event: EventFired<graphql.IssueToIssueLifecycle.Subscription>)
        : { [teamId: string]: Preferences[] } {
        return chatTeamsToPreferences(_.get(event, "data.Issue[0].repo.org.team.chatTeams"));
    }
}

/**
 * Send a lifecycle card on Issue events.
 */
@EventHandler("Send a lifecycle message on Issue events", subscription("issueToIssue"))
@Tags("lifecycle", "issue")
export class IssueToIssueCardLifecycle extends IssueCardLifecycleHandler<graphql.IssueToIssueLifecycle.Subscription> {

    protected extractNodes(event: EventFired<graphql.IssueToIssueLifecycle.Subscription>):
        [graphql.IssueToIssueLifecycle.Issue,
            graphql.IssueFields.Repo,
            graphql.CommentToIssueLifecycle.Comment,
            string] {
        const issue = event.data.Issue[0];
        const repo = event.data.Issue[0].repo;
        return [issue, repo, null, Date.now().toString()];
    }

    protected extractPreferences(event: EventFired<graphql.IssueToIssueLifecycle.Subscription>)
        : { [teamId: string]: Preferences[] } {
        return {};
    }
}
