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
import { configureEventLog } from "@atomist/automation-client-ext-eventlog";
import { configureLogzio } from "@atomist/automation-client-ext-logzio";
import { configureRaven } from "@atomist/automation-client-ext-raven";
import * as secured from "@atomist/automation-client/secured";
import { CloudFoundryApplicationDetail } from "./handlers/command/cloudfoundry/CloudFoundryApplicationDetail";
import { ScaleCloudFoundryApplication } from "./handlers/command/cloudfoundry/ScaleCloudFoundryApplication";
import { StartCloudFoundryApplication } from "./handlers/command/cloudfoundry/StartCloudFoundryApplication";
import { StopCloudFoundryApplication } from "./handlers/command/cloudfoundry/StopCloudFoundryApplication";
import { ApproveGitHubCommit } from "./handlers/command/github/ApproveGitHubCommit";
import { AssignGitHubPullRequestReviewer } from "./handlers/command/github/AssignGitHubPullRequestReviewer";
import { AssignToMeGitHubIssue } from "./handlers/command/github/AssignToMeGitHubIssue";
import { CloseGitHubIssue } from "./handlers/command/github/CloseGitHubIssue";
import { CommentGitHubIssue } from "./handlers/command/github/CommentGitHubIssue";
import { CreateGitHubIssue } from "./handlers/command/github/CreateGitHubIssue";
import { CreateGitHubRelease } from "./handlers/command/github/CreateGitHubRelease";
import {
    CreateGitHubTag,
    createGitHubTagSelection,
} from "./handlers/command/github/CreateGitHubTag";
import {
    CreateRelatedGitHubIssue,
    createRelatedGitHubIssueTargetOwnerSelection,
    createRelatedGitHubIssueTargetRepoSelection,
} from "./handlers/command/github/CreateRelatedGitHubIssue";
import { DeleteGitHubBranch } from "./handlers/command/github/DeleteGitHubBranch";
import { DisplayGitHubIssue } from "./handlers/command/github/DisplayGitHubIssue";
import { DisplayGitHubPullRequest } from "./handlers/command/github/DisplayGitHubPullRequest";
import { EnableGitHubPullRequestAutoMerge } from "./handlers/command/github/EnableGitHubPullRequestAutoMerge";
import {
    InstallGitHubOrgWebhook,
    InstallGitHubReposWebhook,
    InstallGitHubRepoWebhook,
} from "./handlers/command/github/InstallGitHubWebhook";
import {
    LinkRelatedGitHubIssue,
    linkRelatedGitHubIssueTargetIssueSelection,
    linkRelatedGitHubIssueTargetOwnerSelection,
    linkRelatedGitHubIssueTargetRepoSelection,
} from "./handlers/command/github/LinkRelatedGitHubIssue";
import { ListMyGitHubIssues } from "./handlers/command/github/ListMyGitHubIssues";
import { MergeGitHubPullRequest } from "./handlers/command/github/MergeGitHubPullRequest";
import {
    MoveGitHubIssue,
    moveGitHubIssueTargetOwnerSelection,
    moveGitHubIssueTargetRepoSelection,
} from "./handlers/command/github/MoveGitHubIssue";
import { RaiseGitHubPullRequest } from "./handlers/command/github/RaiseGitHubPullRequest";
import { ReactGitHubIssue } from "./handlers/command/github/ReactGitHubIssue";
import { ReactGitHubIssueComment } from "./handlers/command/github/ReactGitHubIssueComment";
import { ReopenGitHubIssue } from "./handlers/command/github/ReopenGitHubIssue";
import { SearchGitHubRepositoryIssues } from "./handlers/command/github/SearchGitHubRepositoryIssues";
import { ToggleLabelGitHubIssue } from "./handlers/command/github/ToggleLabelGitHubIssue";
import {
    ConfigureDirectMessageUserPreferences,
} from "./handlers/command/preferences/ConfigureDirectMessageUserPreferences";
import { ConfigureLifecyclePreferences } from "./handlers/command/preferences/ConfigureLifecyclePreferences";
import { SetTeamPreference } from "./handlers/command/preferences/SetTeamPreference";
import { SetUserPreference } from "./handlers/command/preferences/SetUserPreference";
import { UpdateSdmGoalState } from "./handlers/command/sdm/UpdateSdmGoalState";
import { AddBotToChannel } from "./handlers/command/slack/AddBotToChannel";
import { AssociateRepo } from "./handlers/command/slack/AssociateRepo";
import { cancelConversation } from "./handlers/command/slack/cancel";
import { CreateChannel } from "./handlers/command/slack/CreateChannel";
import { LinkOwnerRepo } from "./handlers/command/slack/LinkOwnerRepo";
import { LinkRepo } from "./handlers/command/slack/LinkRepo";
import { ListRepoLinks } from "./handlers/command/slack/ListRepoLinks";
import { NoLinkRepo } from "./handlers/command/slack/NoLinkRepo";
import { ToggleCustomEmojiEnablement } from "./handlers/command/slack/ToggleCustomEmojiEnablement";
import { UnlinkRepo } from "./handlers/command/slack/UnlinkRepo";
import { CancelTravisBuild } from "./handlers/command/travis/CancelTravisBuild";
import { RestartTravisBuild } from "./handlers/command/travis/RestartTravisBuild";
import { BranchToBranchLifecycle } from "./handlers/event/branch/BranchToBranchLifecycle";
import { DeletedBranchToBranchLifecycle } from "./handlers/event/branch/DeletedBranchToBranchLifecycle";
import { PullRequestToBranchLifecycle } from "./handlers/event/branch/PullRequestToBranchLifecycle";
import { NotifyPusherOnBuild } from "./handlers/event/build/NotifyPusherOnBuild";
import { BotJoinedChannel } from "./handlers/event/channellink/BotJoinedChannel";
import { ChannelLinkCreated } from "./handlers/event/channellink/ChannelLinkCreated";
import { CommentToIssueCommentLifecycle } from "./handlers/event/comment/CommentToIssueCommentLifecycle";
import { CommentToPullRequestCommentLifecycle } from "./handlers/event/comment/CommentToPullRequestCommentLifecycle";
import { IssueToIssueCommentLifecycle } from "./handlers/event/comment/IssueToIssueCommentLifecycle";
import { NotifyMentionedOnIssueComment } from "./handlers/event/comment/NotifyMentionedOnIssueComment";
import { NotifyMentionedOnPullRequestComment } from "./handlers/event/comment/NotifyMentionedOnPullRequestComment";
import {
    PullRequestToPullRequestCommentLifecycle,
} from "./handlers/event/comment/PullRequestToPullRequestCommentLifecycle";
import { IssueRelationshipOnCommit } from "./handlers/event/commit/IssueRelationshipOnCommit";
import { CommentOnRelatedIssueClosed } from "./handlers/event/issue/CommentOnRelatedIssueClosed";
import { CommentToIssueCardLifecycle } from "./handlers/event/issue/CommentToIssueLifecycle";
import {
    IssueToIssueCardLifecycle,
    IssueToIssueLifecycle,
} from "./handlers/event/issue/IssueToIssueLifecycle";
import { NotifyMentionedOnIssue } from "./handlers/event/issue/NotifyMentionedOnIssue";
import { DeploymentOnK8Pod } from "./handlers/event/k8container/DeploymentOnK8Pod";
import { RepositoryOnboarded } from "./handlers/event/onboarded/RepositoryOnboarded";
import { AutoMergeOnBuild } from "./handlers/event/pullrequest/AutoMergeOnBuild";
import { AutoMergeOnPullRequest } from "./handlers/event/pullrequest/AutoMergeOnPullRequest";
import { AutoMergeOnReview } from "./handlers/event/pullrequest/AutoMergeOnReview";
import { AutoMergeOnStatus } from "./handlers/event/pullrequest/AutoMergeOnStatus";
import {
    BranchToPullRequestCardLifecycle,
    BranchToPullRequestLifecycle,
} from "./handlers/event/pullrequest/BranchToPullRequestLifecycle";
import {
    CommentToPullRequestCardLifecycle,
    CommentToPullRequestLifecycle,
} from "./handlers/event/pullrequest/CommentToPullRequestLifecycle";
import {
    CommitToPullRequestCardLifecycle,
    CommitToPullRequestLifecycle,
} from "./handlers/event/pullrequest/CommitToPullRequestLifecycle";
import {
    DeletedBranchToPullRequestCardLifecycle,
    DeletedBranchToPullRequestLifecycle,
} from "./handlers/event/pullrequest/DeletedBranchToPullRequestLifecycle";
import { NotifyMentionedOnPullRequest } from "./handlers/event/pullrequest/NotifyMentionedOnPullRequest";
import {
    PullRequestToPullRequestCardLifecycle,
    PullRequestToPullRequestLifecycle,
} from "./handlers/event/pullrequest/PullRequestToPullRequestLifecycle";
import {
    ReviewToPullRequestCardLifecycle,
    ReviewToPullRequestLifecycle,
} from "./handlers/event/pullrequest/ReviewToPullRequestLifecycle";
import {
    StatusToPullRequestCardLifecycle,
    StatusToPullRequestLifecycle,
} from "./handlers/event/pullrequest/StatusToPullRequestLifecycle";
import {
    ApplicationToPushCardLifecycle,
    ApplicationToPushLifecycle,
} from "./handlers/event/push/ApplicationToPushLifecycle";
import {
    BuildToPushCardLifecycle,
    BuildToPushLifecycle,
} from "./handlers/event/push/BuildToPushLifecycle";
import {
    IssueToPushCardLifecycle,
    IssueToPushLifecycle,
} from "./handlers/event/push/IssueToPushLifecycle";
import {
    K8PodToPushCardLifecycle,
    K8PodToPushLifecycle,
} from "./handlers/event/push/K8PodToPushLifecycle";
import { NotifyBotOwnerOnPush } from "./handlers/event/push/NotifyBotOwnerOnPush";
import { NotifyReviewerOnPush } from "./handlers/event/push/NotifyReviewerOnPush";
import {
    ParentImpactToPushCardLifecycle,
    ParentImpactToPushLifecycle,
} from "./handlers/event/push/ParentImpactToPushLifecycle";
import {
    PushToPushCardLifecycle,
    PushToPushLifecycle,
} from "./handlers/event/push/PushToPushLifecycle";
import { PushToUnmappedRepo } from "./handlers/event/push/PushToUnmappedRepo";
import {
    ReleaseToPushCardLifecycle,
    ReleaseToPushLifecycle,
} from "./handlers/event/push/ReleaseToPushLifecycle";
import {
    SdmGoalToPushCardLifecycle,
    SdmGoalToPushLifecycle,
} from "./handlers/event/push/SdmGoalToPushLifecycle";
import {
    StatusToPushCardLifecycle,
    StatusToPushLifecycle,
} from "./handlers/event/push/StatusToPushLifecycle";
import {
    TagToPushCardLifecycle,
    TagToPushLifecycle,
} from "./handlers/event/push/TagToPushLifecycle";
import { NotifyAuthorOnReview } from "./handlers/event/review/NotifyAuthorOnReview";
import { GitHubWebhookCreated } from "./handlers/event/webhook/GitHubWebhookCreated";
import { commitIssueRelationshipIngester } from "./ingesters/commitIssueRelationship";
import { deploymentIngester } from "./ingesters/deployment";
import { issueRelationshipIngester } from "./ingesters/issueRelationship";
import { ShortenUrlAutomationEventListener } from "./util/shorten";

const notLocal = process.env.NODE_ENV === "production" || process.env.NODE_ENV === "staging";
const AdminTeam = "atomist-automation";

export const configuration: any = {
    commands: [
        // cloudfoundry
        secured.githubTeam(() => new CloudFoundryApplicationDetail(), AdminTeam),
        secured.githubTeam(() => new ScaleCloudFoundryApplication(), AdminTeam),
        secured.githubTeam(() => new StartCloudFoundryApplication(), AdminTeam),
        secured.githubTeam(() => new StopCloudFoundryApplication(), AdminTeam),

        // github
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
        commitIssueRelationshipIngester,
        deploymentIngester,
        issueRelationshipIngester,
    ] : [],
    listeners: [
        new ShortenUrlAutomationEventListener(),
    ],
    postProcessors: [
        configureDashboardNotifications,
        configureEventLog(),
        configureRaven,
        configureLogzio,
    ],
};
