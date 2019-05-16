import {
    adaptHandleCommand,
    ExtensionPack,
    metadata,
} from "@atomist/sdm";
import * as _ from "lodash";
import { AddGitHubPullRequestAutoMergeLabels } from "../handlers/command/github/AddGitHubPullRequestAutoMergeLabels";
import { AssignGitHubPullRequestReviewer } from "../handlers/command/github/AssignGitHubPullRequestReviewer";
import { AssignToMeGitHubIssue } from "../handlers/command/github/AssignToMeGitHubIssue";
import { CloseGitHubIssue } from "../handlers/command/github/CloseGitHubIssue";
import { CommentGitHubIssue } from "../handlers/command/github/CommentGitHubIssue";
import { CreateGitHubIssue } from "../handlers/command/github/CreateGitHubIssue";
import { CreateGitHubRelease } from "../handlers/command/github/CreateGitHubRelease";
import {
    CreateGitHubTag,
    createGitHubTagSelection,
} from "../handlers/command/github/CreateGitHubTag";
import {
    CreateRelatedGitHubIssue,
    createRelatedGitHubIssueTargetOwnerSelection,
    createRelatedGitHubIssueTargetRepoSelection,
} from "../handlers/command/github/CreateRelatedGitHubIssue";
import { DeleteGitHubBranch } from "../handlers/command/github/DeleteGitHubBranch";
import { DisplayGitHubIssue } from "../handlers/command/github/DisplayGitHubIssue";
import { DisplayGitHubPullRequest } from "../handlers/command/github/DisplayGitHubPullRequest";
import { EnableGitHubPullRequestAutoMerge } from "../handlers/command/github/EnableGitHubPullRequestAutoMerge";
import {
    LinkRelatedGitHubIssue,
    linkRelatedGitHubIssueTargetIssueSelection,
    linkRelatedGitHubIssueTargetOwnerSelection,
    linkRelatedGitHubIssueTargetRepoSelection,
} from "../handlers/command/github/LinkRelatedGitHubIssue";
import { ListMyGitHubIssues } from "../handlers/command/github/ListMyGitHubIssues";
import { MergeGitHubPullRequest } from "../handlers/command/github/MergeGitHubPullRequest";
import {
    MoveGitHubIssue,
    moveGitHubIssueTargetOwnerSelection,
    moveGitHubIssueTargetRepoSelection,
} from "../handlers/command/github/MoveGitHubIssue";
import { RaiseGitHubPullRequest } from "../handlers/command/github/RaiseGitHubPullRequest";
import { ReactGitHubIssue } from "../handlers/command/github/ReactGitHubIssue";
import { ReactGitHubIssueComment } from "../handlers/command/github/ReactGitHubIssueComment";
import { ReopenGitHubIssue } from "../handlers/command/github/ReopenGitHubIssue";
import { SearchGitHubRepositoryIssues } from "../handlers/command/github/SearchGitHubRepositoryIssues";
import { ToggleLabelGitHubIssue } from "../handlers/command/github/ToggleLabelGitHubIssue";
import { RaisePrActionContributor } from "../handlers/event/branch/rendering/BranchActionContributors";
import * as ca from "../handlers/event/comment/rendering/CommentActionContributors";
import * as ia from "../handlers/event/issue/rendering/IssueActionContributors";
import * as pra from "../handlers/event/pullrequest/rendering/PullRequestActionContributors";
import * as pa from "../handlers/event/push/rendering/PushActionContributors";
import * as rra from "../handlers/event/review/rendering/ReviewActionContributors";
import { CardActionContributorWrapper } from "../lifecycle/Lifecycle";
import {
    DefaultLifecycleRenderingOptions,
    LifecycleOptions,
    lifecycleSupport,
} from "./lifecycleSupport";

export const DefaultGitHubLifecycleOptions: LifecycleOptions = _.merge(DefaultLifecycleRenderingOptions, {
    branch: {
        chat: {
            actions: repo => !repo.org.provider.private ? [
                new RaisePrActionContributor(),
            ] : [],
        },
    },
    comment: {
        chat: {
            actions: repo => !repo.org.provider.private ? [
                new ca.AssignActionContributor(),
                new ca.CommentActionContributor(),
                new ca.LabelActionContributor(),
                new ca.ReactionActionContributor(),
                new ca.CloseActionContributor(),
                new ca.DetailsActionContributor(),
            ] : [],
        },
    },
    issue: {
        chat: {
            actions: repo => !repo.org.provider.private ? [
                new ia.CommentActionContributor(),
                new ia.LabelActionContributor(),
                new ia.ReactionActionContributor(),
                new ia.AssignToMeActionContributor(),
                new ia.AssignActionContributor(),
                new ia.MoveActionContributor(),
                new ia.RelatedActionContributor(),
                new ia.ReopenActionContributor(),
                new ia.CloseActionContributor(),
                new ia.DisplayMoreActionContributor(),
            ] : [],
        },
        web: {
            actions: repo => !repo.org.provider.private ? [
                new CardActionContributorWrapper(new ia.CommentActionContributor()),
                new CardActionContributorWrapper(new ia.ReactionActionContributor()),
                new CardActionContributorWrapper(new ia.LabelActionContributor()),
                new CardActionContributorWrapper(new ia.AssignToMeActionContributor("issue")),
                new CardActionContributorWrapper(new ia.AssignActionContributor("issue")),
                new CardActionContributorWrapper(new ia.CloseActionContributor()),
                new CardActionContributorWrapper(new ia.ReopenActionContributor()),
            ] : [],
        },
    },
    pullRequest: {
        chat: {
            actions: repo => !repo.org.provider.private ? [
                new pra.MergeActionContributor(),
                new pra.AssignReviewerActionContributor(),
                new pra.AutoMergeActionContributor(),
                new pra.CommentActionContributor(),
                new pra.ThumbsUpActionContributor(),
                new pra.ApproveActionContributor(),
                new pra.DeleteActionContributor(),
            ] : [],
        },
        web: {
            actions: repo => !repo.org.provider.private ? [
                new CardActionContributorWrapper(new pra.MergeActionContributor()),
                new CardActionContributorWrapper(new pra.AssignReviewerActionContributor()),
                new CardActionContributorWrapper(new pra.AutoMergeActionContributor()),
                new CardActionContributorWrapper(new pra.CommentActionContributor()),
                new CardActionContributorWrapper(new pra.ThumbsUpActionContributor()),
                new CardActionContributorWrapper(new pra.ApproveActionContributor()),
                new CardActionContributorWrapper(new pra.DeleteActionContributor()),
            ] : [],
        },
    },
    push: {
        chat: {
            actions: push => !push.repo.org.provider.private ? [
                new pa.TagPushActionContributor(),
                new pa.TagTagActionContributor(),
                new pa.ReleaseActionContributor(),
                new pa.PullRequestActionContributor(),
                new pa.ApproveGoalActionContributor(),
                new pa.CancelGoalSetActionContributor(),
                new pa.DisplayGoalActionContributor(),
                new pa.ExpandAttachmentsActionContributor(),
            ] : [
                new pa.ApproveGoalActionContributor(),
                new pa.CancelGoalSetActionContributor(),
                new pa.DisplayGoalActionContributor(),
                new pa.ExpandAttachmentsActionContributor(),
            ],
        },
        web: {
            actions: push => !push.repo.org.provider.private ? [
                new CardActionContributorWrapper(new pa.TagPushActionContributor()),
                new CardActionContributorWrapper(new pa.TagTagActionContributor()),
                new CardActionContributorWrapper(new pa.ReleaseActionContributor()),
                new CardActionContributorWrapper(new pa.PullRequestActionContributor()),
                new CardActionContributorWrapper(new pa.ApproveGoalActionContributor()),
                new CardActionContributorWrapper(new pa.CancelGoalSetActionContributor()),
            ] : [
                new CardActionContributorWrapper(new pa.ApproveGoalActionContributor()),
                new CardActionContributorWrapper(new pa.CancelGoalSetActionContributor()),
            ],
        },
    },
    review: {
        chat: {
            actions: repo => !repo.org.provider.private ? [
                new rra.CommentActionContributor(),
            ] : [],
        },
    },
    commands: [
        adaptHandleCommand(AddGitHubPullRequestAutoMergeLabels),
        adaptHandleCommand(AssignGitHubPullRequestReviewer),
        adaptHandleCommand(AssignToMeGitHubIssue),
        adaptHandleCommand(CloseGitHubIssue),
        adaptHandleCommand(CommentGitHubIssue),
        adaptHandleCommand(CreateGitHubIssue),
        adaptHandleCommand(CreateGitHubRelease),
        adaptHandleCommand(CreateGitHubTag),
        adaptHandleCommand(() => createGitHubTagSelection()),
        adaptHandleCommand(CreateRelatedGitHubIssue),
        adaptHandleCommand(() => createRelatedGitHubIssueTargetOwnerSelection()),
        adaptHandleCommand(() => createRelatedGitHubIssueTargetRepoSelection()),
        adaptHandleCommand(DeleteGitHubBranch),
        adaptHandleCommand(DisplayGitHubIssue),
        adaptHandleCommand(DisplayGitHubPullRequest),
        adaptHandleCommand(EnableGitHubPullRequestAutoMerge),
        adaptHandleCommand(LinkRelatedGitHubIssue),
        adaptHandleCommand(() => linkRelatedGitHubIssueTargetOwnerSelection()),
        adaptHandleCommand(() => linkRelatedGitHubIssueTargetRepoSelection()),
        adaptHandleCommand(() => linkRelatedGitHubIssueTargetIssueSelection()),
        adaptHandleCommand(ListMyGitHubIssues),
        adaptHandleCommand(MergeGitHubPullRequest),
        adaptHandleCommand(MoveGitHubIssue),
        adaptHandleCommand(() => moveGitHubIssueTargetOwnerSelection()),
        adaptHandleCommand(() => moveGitHubIssueTargetRepoSelection()),
        adaptHandleCommand(RaiseGitHubPullRequest),
        adaptHandleCommand(ReactGitHubIssue),
        adaptHandleCommand(ReactGitHubIssueComment),
        adaptHandleCommand(ReopenGitHubIssue),
        adaptHandleCommand(SearchGitHubRepositoryIssues),
        adaptHandleCommand(ToggleLabelGitHubIssue),
    ],
});

export function githubLifecycleSupport(): ExtensionPack {
    return {
        ...metadata("github-lifecycle"),
        configure: sdm => {
            lifecycleSupport(DefaultGitHubLifecycleOptions).configure(sdm);
        },
    };
}
