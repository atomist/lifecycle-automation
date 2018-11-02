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

import { configureDashboardNotifications } from "@atomist/automation-client-ext-dashboard";
import { configureLogzio } from "@atomist/automation-client-ext-logzio";
import { configureRaven } from "@atomist/automation-client-ext-raven";
import {
    GraphQL,
    secured,
} from "@atomist/automation-client/index";
import { CloudFoundryApplicationDetail } from "./lib/handlers/command/cloudfoundry/CloudFoundryApplicationDetail";
import { ScaleCloudFoundryApplication } from "./lib/handlers/command/cloudfoundry/ScaleCloudFoundryApplication";
import { StartCloudFoundryApplication } from "./lib/handlers/command/cloudfoundry/StartCloudFoundryApplication";
import { StopCloudFoundryApplication } from "./lib/handlers/command/cloudfoundry/StopCloudFoundryApplication";
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
    InstallGitHubOrgWebhook,
    InstallGitHubReposWebhook,
    InstallGitHubRepoWebhook,
} from "./lib/handlers/command/github/InstallGitHubWebhook";
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
import {
    ConfigureDirectMessageUserPreferences,
} from "./lib/handlers/command/preferences/ConfigureDirectMessageUserPreferences";
import { ConfigureLifecyclePreferences } from "./lib/handlers/command/preferences/ConfigureLifecyclePreferences";
import { SetTeamPreference } from "./lib/handlers/command/preferences/SetTeamPreference";
import { SetUserPreference } from "./lib/handlers/command/preferences/SetUserPreference";
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
import { UnlinkRepo } from "./lib/handlers/command/slack/UnlinkRepo";
import { CancelTravisBuild } from "./lib/handlers/command/travis/CancelTravisBuild";
import { RestartTravisBuild } from "./lib/handlers/command/travis/RestartTravisBuild";
import { BranchToBranchLifecycle } from "./lib/handlers/event/branch/BranchToBranchLifecycle";
import { DeletedBranchToBranchLifecycle } from "./lib/handlers/event/branch/DeletedBranchToBranchLifecycle";
import { PullRequestToBranchLifecycle } from "./lib/handlers/event/branch/PullRequestToBranchLifecycle";
import { NotifyPusherOnBuild } from "./lib/handlers/event/build/NotifyPusherOnBuild";
import { BotJoinedChannel } from "./lib/handlers/event/channellink/BotJoinedChannel";
import { ChannelLinkCreated } from "./lib/handlers/event/channellink/ChannelLinkCreated";
import { CommentToIssueCommentLifecycle } from "./lib/handlers/event/comment/CommentToIssueCommentLifecycle";
import {
    CommentToPullRequestCommentLifecycle,
} from "./lib/handlers/event/comment/CommentToPullRequestCommentLifecycle";
import { IssueToIssueCommentLifecycle } from "./lib/handlers/event/comment/IssueToIssueCommentLifecycle";
import { NotifyMentionedOnIssueComment } from "./lib/handlers/event/comment/NotifyMentionedOnIssueComment";
import { NotifyMentionedOnPullRequestComment } from "./lib/handlers/event/comment/NotifyMentionedOnPullRequestComment";
import {
    PullRequestToPullRequestCommentLifecycle,
} from "./lib/handlers/event/comment/PullRequestToPullRequestCommentLifecycle";
import { IssueRelationshipOnCommit } from "./lib/handlers/event/commit/IssueRelationshipOnCommit";
import { CommentOnRelatedIssueClosed } from "./lib/handlers/event/issue/CommentOnRelatedIssueClosed";
import { CommentToIssueCardLifecycle } from "./lib/handlers/event/issue/CommentToIssueLifecycle";
import {
    IssueToIssueCardLifecycle,
    IssueToIssueLifecycle,
} from "./lib/handlers/event/issue/IssueToIssueLifecycle";
import { NotifyMentionedOnIssue } from "./lib/handlers/event/issue/NotifyMentionedOnIssue";
import { DeploymentOnK8Pod } from "./lib/handlers/event/k8container/DeploymentOnK8Pod";
import { RepositoryOnboarded } from "./lib/handlers/event/onboarded/RepositoryOnboarded";
import { AutoMergeOnBuild } from "./lib/handlers/event/pullrequest/AutoMergeOnBuild";
import { AutoMergeOnPullRequest } from "./lib/handlers/event/pullrequest/AutoMergeOnPullRequest";
import { AutoMergeOnReview } from "./lib/handlers/event/pullrequest/AutoMergeOnReview";
import { AutoMergeOnStatus } from "./lib/handlers/event/pullrequest/AutoMergeOnStatus";
import {
    BranchToPullRequestCardLifecycle,
    BranchToPullRequestLifecycle,
} from "./lib/handlers/event/pullrequest/BranchToPullRequestLifecycle";
import {
    CommentToPullRequestCardLifecycle,
    CommentToPullRequestLifecycle,
} from "./lib/handlers/event/pullrequest/CommentToPullRequestLifecycle";
import {
    CommitToPullRequestCardLifecycle,
    CommitToPullRequestLifecycle,
} from "./lib/handlers/event/pullrequest/CommitToPullRequestLifecycle";
import {
    DeletedBranchToPullRequestCardLifecycle,
    DeletedBranchToPullRequestLifecycle,
} from "./lib/handlers/event/pullrequest/DeletedBranchToPullRequestLifecycle";
import { NotifyMentionedOnPullRequest } from "./lib/handlers/event/pullrequest/NotifyMentionedOnPullRequest";
import {
    PullRequestToPullRequestCardLifecycle,
    PullRequestToPullRequestLifecycle,
} from "./lib/handlers/event/pullrequest/PullRequestToPullRequestLifecycle";
import {
    ReviewToPullRequestCardLifecycle,
    ReviewToPullRequestLifecycle,
} from "./lib/handlers/event/pullrequest/ReviewToPullRequestLifecycle";
import {
    StatusToPullRequestCardLifecycle,
    StatusToPullRequestLifecycle,
} from "./lib/handlers/event/pullrequest/StatusToPullRequestLifecycle";
import {
    ApplicationToPushCardLifecycle,
    ApplicationToPushLifecycle,
} from "./lib/handlers/event/push/ApplicationToPushLifecycle";
import {
    BuildToPushCardLifecycle,
    BuildToPushLifecycle,
} from "./lib/handlers/event/push/BuildToPushLifecycle";
import {
    IssueToPushCardLifecycle,
    IssueToPushLifecycle,
} from "./lib/handlers/event/push/IssueToPushLifecycle";
import {
    K8PodToPushCardLifecycle,
    K8PodToPushLifecycle,
} from "./lib/handlers/event/push/K8PodToPushLifecycle";
import { NotifyBotOwnerOnPush } from "./lib/handlers/event/push/NotifyBotOwnerOnPush";
import { NotifyReviewerOnPush } from "./lib/handlers/event/push/NotifyReviewerOnPush";
import {
    ParentImpactToPushCardLifecycle,
    ParentImpactToPushLifecycle,
} from "./lib/handlers/event/push/ParentImpactToPushLifecycle";
import {
    PushToPushCardLifecycle,
    PushToPushLifecycle,
} from "./lib/handlers/event/push/PushToPushLifecycle";
import { PushToUnmappedRepo } from "./lib/handlers/event/push/PushToUnmappedRepo";
import {
    ReleaseToPushCardLifecycle,
    ReleaseToPushLifecycle,
} from "./lib/handlers/event/push/ReleaseToPushLifecycle";
import {
    SdmGoalToPushCardLifecycle,
    SdmGoalToPushLifecycle,
} from "./lib/handlers/event/push/SdmGoalToPushLifecycle";
import {
    StatusToPushCardLifecycle,
    StatusToPushLifecycle,
} from "./lib/handlers/event/push/StatusToPushLifecycle";
import {
    TagToPushCardLifecycle,
    TagToPushLifecycle,
} from "./lib/handlers/event/push/TagToPushLifecycle";
import { NotifyAuthorOnReview } from "./lib/handlers/event/review/NotifyAuthorOnReview";
import { GitHubWebhookCreated } from "./lib/handlers/event/webhook/GitHubWebhookCreated";
import { ShortenUrlAutomationEventListener } from "./lib/util/shorten";

const notLocal = process.env.NODE_ENV === "production" || process.env.NODE_ENV === "testing";
const AdminTeam = "atomist-automation";

export const configuration: any = {
    commands: [
        // cloudfoundry
        secured.githubTeam(() => new CloudFoundryApplicationDetail(), AdminTeam),
        secured.githubTeam(() => new ScaleCloudFoundryApplication(), AdminTeam),
        secured.githubTeam(() => new StartCloudFoundryApplication(), AdminTeam),
        secured.githubTeam(() => new StopCloudFoundryApplication(), AdminTeam),

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
        () => new InstallGitHubOrgWebhook(),
        () => new InstallGitHubRepoWebhook(),
        () => new InstallGitHubReposWebhook(),
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
        () => new UnlinkRepo(),

        // travis
        () => new CancelTravisBuild(),
        () => new RestartTravisBuild(),
    ],
    events: [
        // branch
        () => new BranchToBranchLifecycle(),
        () => new DeletedBranchToBranchLifecycle(),
        () => new PullRequestToBranchLifecycle(),

        // build
        () => new NotifyPusherOnBuild(),

        // channellink
        () => new BotJoinedChannel(),
        () => new ChannelLinkCreated(),

        // parentimpact
        // () => new StatusOnParentImpact(),

        // push
        () => new ApplicationToPushLifecycle(),
        () => new BuildToPushLifecycle(),
        () => new IssueToPushLifecycle(),
        () => new K8PodToPushLifecycle(),
        () => new NotifyBotOwnerOnPush(),
        () => new NotifyReviewerOnPush(),
        () => new ParentImpactToPushLifecycle(),
        () => new PushToPushLifecycle(),
        () => new PushToUnmappedRepo(),
        () => new ReleaseToPushLifecycle(),
        () => new SdmGoalToPushLifecycle(),
        () => new StatusToPushLifecycle(),
        () => new TagToPushLifecycle(),

        // issue
        () => new CommentOnRelatedIssueClosed(),
        () => new IssueToIssueLifecycle(),
        () => new NotifyMentionedOnIssue(),

        // k8container
        () => new DeploymentOnK8Pod(),

        // onboarded
        () => new RepositoryOnboarded(),

        // pullRequest
        () => new AutoMergeOnBuild(),
        () => new AutoMergeOnPullRequest(),
        () => new AutoMergeOnReview(),
        () => new AutoMergeOnStatus(),
        () => new BranchToPullRequestLifecycle(),
        () => new CommentToPullRequestLifecycle(),
        () => new CommitToPullRequestLifecycle(),
        () => new DeletedBranchToPullRequestLifecycle(),
        () => new NotifyMentionedOnPullRequest(),
        () => new PullRequestToPullRequestLifecycle(),
        () => new ReviewToPullRequestLifecycle(),
        () => new StatusToPullRequestLifecycle(),

        // comment
        () => new CommentToIssueCommentLifecycle(),
        () => new CommentToPullRequestCommentLifecycle(),
        () => new IssueToIssueCommentLifecycle(),
        () => new NotifyMentionedOnIssueComment(),
        () => new NotifyMentionedOnPullRequestComment(),
        () => new PullRequestToPullRequestCommentLifecycle(),

        // commit
        () => new IssueRelationshipOnCommit(),

        // review
        () => new NotifyAuthorOnReview(),
        // () => new PullRequestToReviewLifecycle(),
        // () => new ReviewToReviewLifecycle(),

        // webhook
        () => new GitHubWebhookCreated(),

        // add card handlers

        // push
        () => new ApplicationToPushCardLifecycle(),
        () => new BuildToPushCardLifecycle(),
        () => new IssueToPushCardLifecycle(),
        () => new K8PodToPushCardLifecycle(),
        () => new ParentImpactToPushCardLifecycle(),
        () => new PushToPushCardLifecycle(),
        () => new ReleaseToPushCardLifecycle(),
        () => new SdmGoalToPushCardLifecycle(),
        () => new StatusToPushCardLifecycle(),
        () => new TagToPushCardLifecycle(),

        // pullRequest
        () => new BranchToPullRequestCardLifecycle(),
        () => new CommentToPullRequestCardLifecycle(),
        () => new CommitToPullRequestCardLifecycle(),
        () => new DeletedBranchToPullRequestCardLifecycle(),
        () => new PullRequestToPullRequestCardLifecycle(),
        () => new ReviewToPullRequestCardLifecycle(),
        () => new StatusToPullRequestCardLifecycle(),

        // issue
        () => new IssueToIssueCardLifecycle(),
        () => new CommentToIssueCardLifecycle(),
    ],
    ingesters: notLocal ? [
        GraphQL.ingester({ path: "./lib/graphql/ingester/commitIssueRelationship" }),
        GraphQL.ingester({ path: "./lib/graphql/ingester/deployment" }),
        GraphQL.ingester({ path: "./lib/graphql/ingester/issueRelationship" }),
    ] : [],
    listeners: [
        new ShortenUrlAutomationEventListener(),
    ],
    postProcessors: [
        configureDashboardNotifications,
        configureRaven,
        configureLogzio,
    ],
    ws: {
        timeout: 20000,
    },
};
