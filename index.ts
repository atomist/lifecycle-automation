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

import { GraphQL } from "@atomist/automation-client";
import { configureDashboardNotifications } from "@atomist/automation-client-ext-dashboard";
import { configureHumio } from "@atomist/automation-client-ext-humio";
import { configureRaven } from "@atomist/automation-client-ext-raven";
import { configureSdm } from "@atomist/sdm-core";
import { AddGitHubPullRequestAutoMergeLabels } from "./lib/handlers/command/github/AddGitHubPullRequestAutoMergeLabels";
import { ApproveGitHubCommit } from "./lib/handlers/command/github/ApproveGitHubCommit";
import { AssignGitHubPullRequestReviewer } from "./lib/handlers/command/github/AssignGitHubPullRequestReviewer";
import { AssignToMeGitHubIssue } from "./lib/handlers/command/github/AssignToMeGitHubIssue";
import { CloseGitHubIssue } from "./lib/handlers/command/github/CloseGitHubIssue";
import { CommentGitHubIssue } from "./lib/handlers/command/github/CommentGitHubIssue";
import { CreateGitHubIssue } from "./lib/handlers/command/github/CreateGitHubIssue";
import { CreateGitHubRelease } from "./lib/handlers/command/github/CreateGitHubRelease";
import {
    CreateGitHubTag,
    createGitHubTagSelection,
} from "./lib/handlers/command/github/CreateGitHubTag";
import {
    CreateRelatedGitHubIssue,
    createRelatedGitHubIssueTargetOwnerSelection,
    createRelatedGitHubIssueTargetRepoSelection,
} from "./lib/handlers/command/github/CreateRelatedGitHubIssue";
import { DeleteGitHubBranch } from "./lib/handlers/command/github/DeleteGitHubBranch";
import { DisplayGitHubIssue } from "./lib/handlers/command/github/DisplayGitHubIssue";
import { DisplayGitHubPullRequest } from "./lib/handlers/command/github/DisplayGitHubPullRequest";
import { EnableGitHubPullRequestAutoMerge } from "./lib/handlers/command/github/EnableGitHubPullRequestAutoMerge";
import {
    LinkRelatedGitHubIssue,
    linkRelatedGitHubIssueTargetIssueSelection,
    linkRelatedGitHubIssueTargetOwnerSelection,
    linkRelatedGitHubIssueTargetRepoSelection,
} from "./lib/handlers/command/github/LinkRelatedGitHubIssue";
import { ListMyGitHubIssues } from "./lib/handlers/command/github/ListMyGitHubIssues";
import { MergeGitHubPullRequest } from "./lib/handlers/command/github/MergeGitHubPullRequest";
import {
    MoveGitHubIssue,
    moveGitHubIssueTargetOwnerSelection,
    moveGitHubIssueTargetRepoSelection,
} from "./lib/handlers/command/github/MoveGitHubIssue";
import { RaiseGitHubPullRequest } from "./lib/handlers/command/github/RaiseGitHubPullRequest";
import { ReactGitHubIssue } from "./lib/handlers/command/github/ReactGitHubIssue";
import { ReactGitHubIssueComment } from "./lib/handlers/command/github/ReactGitHubIssueComment";
import { ReopenGitHubIssue } from "./lib/handlers/command/github/ReopenGitHubIssue";
import { SearchGitHubRepositoryIssues } from "./lib/handlers/command/github/SearchGitHubRepositoryIssues";
import { ToggleLabelGitHubIssue } from "./lib/handlers/command/github/ToggleLabelGitHubIssue";
import { ConfigureDirectMessageUserPreferences } from "./lib/handlers/command/preferences/ConfigureDirectMessageUserPreferences";
import { ConfigureLifecyclePreferences } from "./lib/handlers/command/preferences/ConfigureLifecyclePreferences";
import { SetTeamPreference } from "./lib/handlers/command/preferences/SetTeamPreference";
import { SetUserPreference } from "./lib/handlers/command/preferences/SetUserPreference";
import { UpdateSdmGoalDisplayState } from "./lib/handlers/command/sdm/UpdateSdmGoalDisplayState";
import { UpdateSdmGoalState } from "./lib/handlers/command/sdm/UpdateSdmGoalState";
import { AddBotToChannel } from "./lib/handlers/command/slack/AddBotToChannel";
import { AssociateRepo } from "./lib/handlers/command/slack/AssociateRepo";
import { cancelConversation } from "./lib/handlers/command/slack/cancel";
import { CreateChannel } from "./lib/handlers/command/slack/CreateChannel";
import { LinkOwnerRepo } from "./lib/handlers/command/slack/LinkOwnerRepo";
import { LinkRepo } from "./lib/handlers/command/slack/LinkRepo";
import { ListRepoLinks } from "./lib/handlers/command/slack/ListRepoLinks";
import { NoLinkRepo } from "./lib/handlers/command/slack/NoLinkRepo";
import { ToggleCustomEmojiEnablement } from "./lib/handlers/command/slack/ToggleCustomEmojiEnablement";
import { ToggleDisplayFormat } from "./lib/handlers/command/slack/ToggleDisplayFormat";
import { UnlinkRepo } from "./lib/handlers/command/slack/UnlinkRepo";
import { machine } from "./lib/machine/machine";

const notLocal = process.env.NODE_ENV === "production" || process.env.NODE_ENV === "testing";

export const configuration: any = {
    commands: [
        // github
        () => new AddGitHubPullRequestAutoMergeLabels(),
        () => new ApproveGitHubCommit(),
        () => new AssignGitHubPullRequestReviewer(),
        () => new AssignToMeGitHubIssue(),
        () => new CloseGitHubIssue(),
        () => new CommentGitHubIssue(),
        () => new CreateGitHubIssue(),
        () => new CreateGitHubRelease(),
        () => new CreateGitHubTag(),
        () => createGitHubTagSelection(),
        () => new CreateRelatedGitHubIssue(),
        () => createRelatedGitHubIssueTargetOwnerSelection(),
        () => createRelatedGitHubIssueTargetRepoSelection(),
        () => new DeleteGitHubBranch(),
        () => new DisplayGitHubIssue(),
        () => new DisplayGitHubPullRequest(),
        () => new EnableGitHubPullRequestAutoMerge(),
        () => new LinkRelatedGitHubIssue(),
        () => linkRelatedGitHubIssueTargetOwnerSelection(),
        () => linkRelatedGitHubIssueTargetRepoSelection(),
        () => linkRelatedGitHubIssueTargetIssueSelection(),
        () => new ListMyGitHubIssues(),
        () => new MergeGitHubPullRequest(),
        () => new MoveGitHubIssue(),
        () => moveGitHubIssueTargetOwnerSelection(),
        () => moveGitHubIssueTargetRepoSelection(),
        () => new RaiseGitHubPullRequest(),
        () => new ReactGitHubIssue(),
        () => new ReactGitHubIssueComment(),
        () => new ReopenGitHubIssue(),
        () => new SearchGitHubRepositoryIssues(),
        () => new ToggleLabelGitHubIssue(),

        // preferences
        () => new ConfigureDirectMessageUserPreferences(),
        () => new ConfigureLifecyclePreferences(),
        () => new SetTeamPreference(),
        () => new SetUserPreference(),

        // sdm
        () => new UpdateSdmGoalState(),
        () => new UpdateSdmGoalDisplayState(),

        // slack
        () => new AddBotToChannel(),
        () => new AssociateRepo(),
        () => cancelConversation(),
        () => new CreateChannel(),
        () => new LinkOwnerRepo(),
        () => new LinkRepo(),
        () => new ListRepoLinks(),
        () => new NoLinkRepo(),
        () => new ToggleCustomEmojiEnablement(),
        () => new ToggleDisplayFormat(),
        () => new UnlinkRepo(),
    ],
    ingesters: notLocal ? [
        GraphQL.ingester({ path: "./lib/graphql/ingester/commitIssueRelationship" }),
        GraphQL.ingester({ path: "./lib/graphql/ingester/deployment" }),
        GraphQL.ingester({ path: "./lib/graphql/ingester/issueRelationship" }),
    ] : [],
    postProcessors: [
        configureDashboardNotifications,
        configureRaven,
        configureHumio,
        configureSdm(machine),
    ],
    ws: {
        timeout: 60000,
    },
    cluster: {
        maxConcurrentPerWorker: 5,
    },
};
