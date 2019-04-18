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

import {
    ExtensionPack,
    metadata,
} from "@atomist/sdm";
import {
    Action,
    SlackMessage,
} from "@atomist/slack-messages";
import { branchToBranchLifecycle } from "../handlers/event/branch/BranchToBranchLifecycle";
import { deletedBranchToBranchLifecycle } from "../handlers/event/branch/DeletedBranchToBranchLifecycle";
import { pullRequestToBranchLifecycle } from "../handlers/event/branch/PullRequestToBranchLifecycle";
import { RaisePrActionContributor } from "../handlers/event/branch/rendering/BranchActionContributors";
import { BranchNodeRenderer } from "../handlers/event/branch/rendering/BranchNodeRenderers";
import { notifyPusherOnBuild } from "../handlers/event/build/NotifyPusherOnBuild";
import { botJoinedChannel } from "../handlers/event/channellink/BotJoinedChannel";
import { channelLinkCreated } from "../handlers/event/channellink/ChannelLinkCreated";
import { commentToIssueCommentLifecycle } from "../handlers/event/comment/CommentToIssueCommentLifecycle";
import { commentToPullRequestCommentLifecycle } from "../handlers/event/comment/CommentToPullRequestCommentLifecycle";
import { issueToIssueCommentLifecycle } from "../handlers/event/comment/IssueToIssueCommentLifecycle";
import { pullRequestToPullRequestCommentLifecycle } from "../handlers/event/comment/PullRequestToPullRequestCommentLifecycle";
import * as ca from "../handlers/event/comment/rendering/CommentActionContributors";
import * as cr from "../handlers/event/comment/rendering/CommentNodeRenderers";
import { issueRelationshipOnCommit } from "../handlers/event/commit/IssueRelationshipOnCommit";
import { commentOnRelatedIssueClosed } from "../handlers/event/issue/CommentOnRelatedIssueClosed";
import { commentToIssueCardLifecycle } from "../handlers/event/issue/CommentToIssueLifecycle";
import {
    issueToIssueCardLifecycle,
    issueToIssueLifecycle,
} from "../handlers/event/issue/IssueToIssueLifecycle";
import { notifyMentionedOnIssue } from "../handlers/event/issue/NotifyMentionedOnIssue";
import * as ia from "../handlers/event/issue/rendering/IssueActionContributors";
import * as icr from "../handlers/event/issue/rendering/IssueCardNodeRenderers";
import * as ir from "../handlers/event/issue/rendering/IssueNodeRenderers";
import { deploymentOnK8Pod } from "../handlers/event/k8container/DeploymentOnK8Pod";
import { repositoryOnboarded } from "../handlers/event/onboarded/RepositoryOnboarded";
import {
    branchToPullRequestCardLifecycle,
    branchToPullRequestLifecycle,
} from "../handlers/event/pullrequest/BranchToPullRequestLifecycle";
import {
    commentToPullRequestCardLifecycle,
    commentToPullRequestLifecycle,
} from "../handlers/event/pullrequest/CommentToPullRequestLifecycle";
import {
    commitToPullRequestCardLifecycle,
    commitToPullRequestLifecycle,
} from "../handlers/event/pullrequest/CommitToPullRequestLifecycle";
import {
    deletedBranchToPullRequestCardLifecycle,
    deletedBranchToPullRequestLifecycle,
} from "../handlers/event/pullrequest/DeletedBranchToPullRequestLifecycle";
import {
    pullRequestToPullRequestCardLifecycle,
    pullRequestToPullRequestLifecycle,
} from "../handlers/event/pullrequest/PullRequestToPullRequestLifecycle";
import * as pra from "../handlers/event/pullrequest/rendering/PullRequestActionContributors";
import * as prc from "../handlers/event/pullrequest/rendering/PullRequestCardNodeRenderers";
import * as prr from "../handlers/event/pullrequest/rendering/PullRequestNodeRenderers";
import {
    reviewToPullRequestCardLifecycle,
    reviewToPullRequestLifecycle,
} from "../handlers/event/pullrequest/ReviewToPullRequestLifecycle";
import {
    statusToPullRequestCardLifecycle,
    statusToPullRequestLifecycle,
} from "../handlers/event/pullrequest/StatusToPullRequestLifecycle";
import {
    applicationToPushCardLifecycle,
    applicationToPushLifecycle,
} from "../handlers/event/push/ApplicationToPushLifecycle";
import {
    buildToPushCardLifecycle,
    buildToPushLifecycle,
} from "../handlers/event/push/BuildToPushLifecycle";
import {
    issueToPushCardLifecycle,
    issueToPushLifecycle,
} from "../handlers/event/push/IssueToPushLifecycle";
import {
    k8PodToPushCardLifecycle,
    k8PodToPushLifecycle,
} from "../handlers/event/push/K8PodToPushLifecycle";
import { notifyReviewerOnPush } from "../handlers/event/push/NotifyReviewerOnPush";
import {
    pushToPushCardLifecycle,
    pushToPushLifecycle,
} from "../handlers/event/push/PushToPushLifecycle";
import { pushToUnmappedRepo } from "../handlers/event/push/PushToUnmappedRepo";
import {
    releaseToPushCardLifecycle,
    releaseToPushLifecycle,
} from "../handlers/event/push/ReleaseToPushLifecycle";
import * as pa from "../handlers/event/push/rendering/PushActionContributors";
import * as pc from "../handlers/event/push/rendering/PushCardNodeRenderers";
import * as pr from "../handlers/event/push/rendering/PushNodeRenderers";
import * as sr from "../handlers/event/push/rendering/StatusesNodeRenderer";
import { sdmGoalDisplayToPushLifecycle } from "../handlers/event/push/SdmGoalDisplayToPushLifecycle";
import {
    sdmGoalToPushCardLifecycle,
    sdmGoalToPushLifecycle,
} from "../handlers/event/push/SdmGoalToPushLifecycle";
import {
    statusToPushCardLifecycle,
    statusToPushLifecycle,
} from "../handlers/event/push/StatusToPushLifecycle";
import {
    tagToPushCardLifecycle,
    tagToPushLifecycle,
} from "../handlers/event/push/TagToPushLifecycle";
import { WorkflowNodeRenderer } from "../handlers/event/push/workflow/WorkflowNodeRenderer";
import { notifyAuthorOnReview } from "../handlers/event/review/NotifyAuthorOnReview";
import { pullRequestToReviewLifecycle } from "../handlers/event/review/PullRequestToReviewLifecycle";
import * as rra from "../handlers/event/review/rendering/ReviewActionContributors";
import * as rr from "../handlers/event/review/rendering/ReviewNodeRenderers";
import { reviewToReviewLifecycle } from "../handlers/event/review/ReviewToReviewLifecycle";
import {
    Action as CardAction,
    CardMessage,
} from "../lifecycle/card";
import {
    ActionContributor,
    CardActionContributorWrapper,
    NodeRenderer,
} from "../lifecycle/Lifecycle";
import { AttachImagesNodeRenderer } from "../lifecycle/rendering/AttachImagesNodeRenderer";
import { CollaboratorCardNodeRenderer } from "../lifecycle/rendering/CollaboratorCardNodeRenderer";
import { EventsCardNodeRenderer } from "../lifecycle/rendering/EventsCardNodeRenderer";
import { ReferencedIssuesNodeRenderer } from "../lifecycle/rendering/ReferencedIssuesNodeRenderer";
import {
    BranchFields,
    IssueFields,
    IssueToIssueCommentLifecycle,
    PullRequestFields,
    PushToPushLifecycle,
    ReviewToReviewLifecycle,
} from "../typings/types";

export type RendererFactory<T, M, A> = (event: T) => Array<NodeRenderer<any, M, A>>;
export type ActionFactory<T, A> = (event: T) => Array<ActionContributor<any, A>>;

export interface Contributions<T = any, M = any, A = any> {
    renderers?: RendererFactory<T, M, A>;
    actions?: ActionFactory<T, A>;
}

export interface LifecycleOptions {
    branch?: {
        chat?: Contributions<BranchFields.Repo, SlackMessage, Action>;
    };
    comment?: {
        chat?: Contributions<IssueToIssueCommentLifecycle.Repo, SlackMessage, Action>;
    },
    issue?: {
        chat?: Contributions<IssueFields.Repo, SlackMessage, Action>;
        web?: Contributions<IssueFields.Repo, CardMessage, CardAction>;
    };
    pullRequest?: {
        chat?: Contributions<PullRequestFields.Repo, SlackMessage, Action>;
        web?: Contributions<PullRequestFields.Repo, CardMessage, CardAction>;
    }
    push?: {
        chat?: Contributions<PushToPushLifecycle.Push, SlackMessage, Action>;
        web?: Contributions<PushToPushLifecycle.Push, CardMessage, CardAction>;
    };
    review?: {
        chat?: Contributions<ReviewToReviewLifecycle.Repo, SlackMessage, Action>;
    }
}

export const DefaultLifecycleOptions: LifecycleOptions = {
    branch: {
        chat: {
            renderers: () => [
                new BranchNodeRenderer(),
            ],
            actions: repo => !repo.org.provider.private ? [
                new RaisePrActionContributor(),
            ] : [],
        },
    },
    comment: {
        chat: {
            renderers: () => [
                new cr.IssueCommentNodeRenderer(),
                new cr.PullRequestCommentNodeRenderer(),
                new ReferencedIssuesNodeRenderer(),
                new AttachImagesNodeRenderer(node => {
                    if (node.issue) {
                        return node.issue.state === "open";
                    } else if (node.pullRequest) {
                        return node.pullRequest.state === "open";
                    } else {
                        return false;
                    }
                })],
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
            renderers: () => [
                new ir.IssueNodeRenderer(),
                new ir.MoreNodeRenderer(),
                new ReferencedIssuesNodeRenderer(),
                new AttachImagesNodeRenderer(node => node.state === "open")],
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
            renderers: () => [
                new icr.IssueCardNodeRenderer(),
                new icr.CommentCardNodeRenderer(),
                new icr.CorrelationsCardNodeRenderer(),
                new icr.ReferencedIssueCardNodeRenderer(),
                new CollaboratorCardNodeRenderer(node => node.body != null),
            ],
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
            renderers: () => [
                new prr.PullRequestNodeRenderer(),
                new prr.CommitNodeRenderer(),
                new prr.BuildNodeRenderer(),
                new prr.StatusNodeRenderer(),
                new prr.ReviewNodeRenderer(),
                new ReferencedIssuesNodeRenderer(),
                new AttachImagesNodeRenderer(node => node.state === "open")],
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
            renderers: () => [
                new prc.PullRequestCardNodeRenderer(),
                new prc.CommitCardNodeRenderer(),
                new prc.BuildCardNodeRenderer(),
                new prc.StatusCardNodeRenderer(),
                new prc.ReviewCardNodeRenderer(),
                new CollaboratorCardNodeRenderer(node => node.baseBranchName != null),
            ],
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
            renderers: () => [
                new pr.PushNodeRenderer(),
                new pr.CommitNodeRenderer(),
                new sr.GoalSetNodeRenderer(),
                new sr.StatusesNodeRenderer(),
                new WorkflowNodeRenderer(),
                new pr.IssueNodeRenderer(),
                new pr.PullRequestNodeRenderer(),
                new ReferencedIssuesNodeRenderer(),
                new pr.TagNodeRenderer(),
                new pr.BuildNodeRenderer(),
                new pr.ApplicationNodeRenderer(),
                new pr.K8PodNodeRenderer(),
                new pr.BlackDuckFingerprintNodeRenderer(),
                new pr.ExpandAttachmentsNodeRenderer()],
            actions: push => !push.repo.org.provider.private ? [
                new pa.TagPushActionContributor(),
                new pa.TagTagActionContributor(),
                new pa.ReleaseActionContributor(),
                new pa.PullRequestActionContributor(),
                new pa.ApproveGoalActionContributor(),
                new pa.DisplayGoalActionContributor(),
                new pa.ExpandAttachmentsActionContributor(),
            ] : [
                new pa.ApproveGoalActionContributor(),
                new pa.DisplayGoalActionContributor(),
                new pa.ExpandAttachmentsActionContributor(),
            ],
        },
        web: {
            renderers: () => [
                new EventsCardNodeRenderer(node => !!node.after),
                new pc.PushCardNodeRenderer(),
                new pc.CommitCardNodeRenderer(),
                new pc.BuildCardNodeRenderer(),
                new sr.StatusesCardNodeRenderer(),
                new sr.GoalCardNodeRenderer(),
                new pc.TagCardNodeRenderer(),
                new pc.IssueCardNodeRenderer(),
                new pc.PullRequestCardNodeRenderer(),
                new pc.ApplicationCardNodeRenderer(),
                new pc.K8PodCardNodeRenderer(),
                new CollaboratorCardNodeRenderer(node => !!node.after),
            ],
            actions: push => !push.repo.org.provider.private ? [
                new CardActionContributorWrapper(new pa.TagPushActionContributor()),
                new CardActionContributorWrapper(new pa.TagTagActionContributor()),
                new CardActionContributorWrapper(new pa.ReleaseActionContributor()),
                new CardActionContributorWrapper(new pa.PullRequestActionContributor()),
                new CardActionContributorWrapper(new pa.ApproveGoalActionContributor()),
            ] : [
                new CardActionContributorWrapper(new pa.ApproveGoalActionContributor()),
            ],
        },
    },
    review: {
        chat: {
            renderers: () => [
                new rr.ReviewNodeRenderer(),
                new rr.ReviewDetailNodeRenderer()],
            actions: repo => !repo.org.provider.private ? [
                new rra.CommentActionContributor(),
            ] : [],
        },
    },
};

export function lifecycleSupport(options: LifecycleOptions = {}): ExtensionPack {
    return {
        ...metadata(),
        configure: sdm => {

            const optsToUse: LifecycleOptions = {
                ...DefaultLifecycleOptions,
                ...options,
            };

            // Build
            sdm.addEvent(notifyPusherOnBuild());

            // Branch
            sdm.addEvent(branchToBranchLifecycle(optsToUse.branch.chat));
            sdm.addEvent(deletedBranchToBranchLifecycle(optsToUse.branch.chat));
            sdm.addEvent(pullRequestToBranchLifecycle(optsToUse.branch.chat));

            // ChannelLink
            sdm.addEvent(botJoinedChannel());
            sdm.addEvent(channelLinkCreated());

            // Comment
            sdm.addEvent(commentToIssueCommentLifecycle(optsToUse.comment.chat));
            sdm.addEvent(commentToPullRequestCommentLifecycle(optsToUse.comment.chat));
            sdm.addEvent(issueToIssueCommentLifecycle(optsToUse.branch.chat));
            sdm.addEvent(pullRequestToPullRequestCommentLifecycle(optsToUse.branch.chat));

            // Commit
            sdm.addEvent(issueRelationshipOnCommit());

            // Issue
            sdm.addEvent(commentOnRelatedIssueClosed());
            sdm.addEvent(notifyMentionedOnIssue());

            sdm.addEvent(issueToIssueLifecycle(optsToUse.issue.chat));

            sdm.addEvent(issueToIssueCardLifecycle(optsToUse.issue.web));
            sdm.addEvent(commentToIssueCardLifecycle(optsToUse.issue.web));

            // K8Pod
            sdm.addEvent(deploymentOnK8Pod());

            // OnBoarded
            sdm.addEvent(repositoryOnboarded(options));

            // Pull Request
            sdm.addEvent(branchToPullRequestLifecycle(optsToUse.pullRequest.chat));
            sdm.addEvent(commentToPullRequestLifecycle(optsToUse.pullRequest.chat));
            sdm.addEvent(commitToPullRequestLifecycle(optsToUse.pullRequest.chat));
            sdm.addEvent(deletedBranchToPullRequestLifecycle(optsToUse.pullRequest.chat));
            sdm.addEvent(pullRequestToPullRequestLifecycle(optsToUse.pullRequest.chat));
            sdm.addEvent(reviewToPullRequestLifecycle(optsToUse.pullRequest.chat));
            sdm.addEvent(statusToPullRequestLifecycle(optsToUse.pullRequest.chat));

            sdm.addEvent(branchToPullRequestCardLifecycle(optsToUse.pullRequest.web));
            sdm.addEvent(commentToPullRequestCardLifecycle(optsToUse.pullRequest.web));
            sdm.addEvent(commitToPullRequestCardLifecycle(optsToUse.pullRequest.web));
            sdm.addEvent(deletedBranchToPullRequestCardLifecycle(optsToUse.pullRequest.web));
            sdm.addEvent(pullRequestToPullRequestCardLifecycle(optsToUse.pullRequest.web));
            sdm.addEvent(reviewToPullRequestCardLifecycle(optsToUse.pullRequest.web));
            sdm.addEvent(statusToPullRequestCardLifecycle(optsToUse.pullRequest.web));

            // Push
            sdm.addEvent(notifyReviewerOnPush());
            sdm.addEvent(pushToUnmappedRepo());

            sdm.addEvent(applicationToPushLifecycle(optsToUse.push.chat));
            sdm.addEvent(buildToPushLifecycle(optsToUse.push.chat));
            sdm.addEvent(issueToPushLifecycle(optsToUse.push.chat));
            sdm.addEvent(k8PodToPushLifecycle(optsToUse.push.chat));
            sdm.addEvent(pushToPushLifecycle(optsToUse.push.chat));
            sdm.addEvent(releaseToPushLifecycle(optsToUse.push.chat));
            sdm.addEvent(sdmGoalDisplayToPushLifecycle(optsToUse.push.chat));
            sdm.addEvent(sdmGoalToPushLifecycle(optsToUse.push.chat));
            sdm.addEvent(statusToPushLifecycle(optsToUse.push.chat));
            sdm.addEvent(tagToPushLifecycle(optsToUse.push.chat));

            sdm.addEvent(applicationToPushCardLifecycle(optsToUse.push.web));
            sdm.addEvent(buildToPushCardLifecycle(optsToUse.push.web));
            sdm.addEvent(issueToPushCardLifecycle(optsToUse.push.web));
            sdm.addEvent(k8PodToPushCardLifecycle(optsToUse.push.web));
            sdm.addEvent(pushToPushCardLifecycle(optsToUse.push.web));
            sdm.addEvent(releaseToPushCardLifecycle(optsToUse.push.web));
            sdm.addEvent(sdmGoalToPushCardLifecycle(optsToUse.push.web));
            sdm.addEvent(statusToPushCardLifecycle(optsToUse.push.web));
            sdm.addEvent(tagToPushCardLifecycle(optsToUse.push.web));

            // Review
            sdm.addEvent(notifyAuthorOnReview());

            sdm.addEvent(pullRequestToReviewLifecycle(optsToUse.review.chat));
            sdm.addEvent(reviewToReviewLifecycle(optsToUse.review.chat));
        },
    };
}
