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
    adaptHandleCommand,
    CommandHandlerRegistration,
    ExtensionPack,
    metadata,
} from "@atomist/sdm";
import { cancelGoalSetsCommand } from "@atomist/sdm-core/lib/pack/goal-state/cancelGoals";
import {
    Action,
    SlackMessage,
} from "@atomist/slack-messages";
import * as _ from "lodash";
import { ConfigureDirectMessageUserPreferences } from "../handlers/command/preferences/ConfigureDirectMessageUserPreferences";
import { ConfigureLifecyclePreferences } from "../handlers/command/preferences/ConfigureLifecyclePreferences";
import { SetTeamPreference } from "../handlers/command/preferences/SetTeamPreference";
import { SetUserPreference } from "../handlers/command/preferences/SetUserPreference";
import { UpdateSdmGoalDisplayState } from "../handlers/command/sdm/UpdateSdmGoalDisplayState";
import { UpdateSdmGoalState } from "../handlers/command/sdm/UpdateSdmGoalState";
import { AddBotToChannel } from "../handlers/command/slack/AddBotToChannel";
import { AssociateRepo } from "../handlers/command/slack/AssociateRepo";
import { cancelConversation } from "../handlers/command/slack/cancel";
import { CreateChannel } from "../handlers/command/slack/CreateChannel";
import { LinkOwnerRepo } from "../handlers/command/slack/LinkOwnerRepo";
import { LinkRepo } from "../handlers/command/slack/LinkRepo";
import { ListRepoLinks } from "../handlers/command/slack/ListRepoLinks";
import { NoLinkRepo } from "../handlers/command/slack/NoLinkRepo";
import { ToggleCustomEmojiEnablement } from "../handlers/command/slack/ToggleCustomEmojiEnablement";
import { ToggleDisplayFormat } from "../handlers/command/slack/ToggleDisplayFormat";
import { UnlinkRepo } from "../handlers/command/slack/UnlinkRepo";
import { branchToBranchLifecycle } from "../handlers/event/branch/BranchToBranchLifecycle";
import { deletedBranchToBranchLifecycle } from "../handlers/event/branch/DeletedBranchToBranchLifecycle";
import { pullRequestToBranchLifecycle } from "../handlers/event/branch/PullRequestToBranchLifecycle";
import { BranchNodeRenderer } from "../handlers/event/branch/rendering/BranchNodeRenderers";
import { notifyPusherOnBuild } from "../handlers/event/build/NotifyPusherOnBuild";
import { botJoinedChannel } from "../handlers/event/channellink/BotJoinedChannel";
import { channelLinkCreated } from "../handlers/event/channellink/ChannelLinkCreated";
import { commentToIssueCommentLifecycle } from "../handlers/event/comment/CommentToIssueCommentLifecycle";
import { commentToPullRequestCommentLifecycle } from "../handlers/event/comment/CommentToPullRequestCommentLifecycle";
import { issueToIssueCommentLifecycle } from "../handlers/event/comment/IssueToIssueCommentLifecycle";
import { notifyMentionedOnIssueComment } from "../handlers/event/comment/NotifyMentionedOnIssueComment";
import { notifyMentionedOnPullRequestComment } from "../handlers/event/comment/NotifyMentionedOnPullRequestComment";
import { pullRequestToPullRequestCommentLifecycle } from "../handlers/event/comment/PullRequestToPullRequestCommentLifecycle";
import * as cr from "../handlers/event/comment/rendering/CommentNodeRenderers";
import { issueRelationshipOnCommit } from "../handlers/event/commit/IssueRelationshipOnCommit";
import { commentOnRelatedIssueClosed } from "../handlers/event/issue/CommentOnRelatedIssueClosed";
import { commentToIssueCardLifecycle } from "../handlers/event/issue/CommentToIssueLifecycle";
import {
    issueToIssueCardLifecycle,
    issueToIssueLifecycle,
} from "../handlers/event/issue/IssueToIssueLifecycle";
import { notifyMentionedOnIssue } from "../handlers/event/issue/NotifyMentionedOnIssue";
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
import { notifyMentionedOnPullRequest } from "../handlers/event/pullrequest/NotifyMentionedOnPullRequest";
import {
    pullRequestToPullRequestCardLifecycle,
    pullRequestToPullRequestLifecycle,
} from "../handlers/event/pullrequest/PullRequestToPullRequestLifecycle";
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
import * as rr from "../handlers/event/review/rendering/ReviewNodeRenderers";
import { reviewToReviewLifecycle } from "../handlers/event/review/ReviewToReviewLifecycle";
import {
    Action as CardAction,
    CardMessage,
} from "../lifecycle/card";
import {
    ActionContributor,
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
    };
    issue?: {
        chat?: Contributions<IssueFields.Repo, SlackMessage, Action>;
        web?: Contributions<IssueFields.Repo, CardMessage, CardAction>;
    };
    pullRequest?: {
        chat?: Contributions<PullRequestFields.Repo, SlackMessage, Action>;
        web?: Contributions<PullRequestFields.Repo, CardMessage, CardAction>;
    };
    push?: {
        chat?: Contributions<PushToPushLifecycle.Push, SlackMessage, Action>;
        web?: Contributions<PushToPushLifecycle.Push, CardMessage, CardAction>;
    };
    review?: {
        chat?: Contributions<ReviewToReviewLifecycle.Repo, SlackMessage, Action>;
    };
    commands?: CommandHandlerRegistration[];
}

export const DefaultLifecycleRenderingOptions: LifecycleOptions = {
    branch: {
        chat: {
            renderers: () => [
                new BranchNodeRenderer(),
            ],
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
        },
    },
    issue: {
        chat: {
            renderers: () => [
                new ir.IssueNodeRenderer(),
                new ir.MoreNodeRenderer(),
                new ReferencedIssuesNodeRenderer(),
                new AttachImagesNodeRenderer(node => node.state === "open")],
        },
        web: {
            renderers: () => [
                new icr.IssueCardNodeRenderer(),
                new icr.CommentCardNodeRenderer(),
                new icr.CorrelationsCardNodeRenderer(),
                new icr.ReferencedIssueCardNodeRenderer(),
                new CollaboratorCardNodeRenderer(node => node.body != undefined),
            ],
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
        },
        web: {
            renderers: () => [
                new prc.PullRequestCardNodeRenderer(),
                new prc.CommitCardNodeRenderer(),
                new prc.BuildCardNodeRenderer(),
                new prc.StatusCardNodeRenderer(),
                new prc.ReviewCardNodeRenderer(),
                new CollaboratorCardNodeRenderer(node => node.baseBranchName != undefined),
            ],
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
                new pr.ExpandAttachmentsNodeRenderer(),
                new pr.ExpandNodeRenderer()],
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
        },
    },
    review: {
        chat: {
            renderers: () => [
                new rr.ReviewNodeRenderer(),
                new rr.ReviewDetailNodeRenderer()],
        },
    },
};

export function lifecycleSupport(options: LifecycleOptions = {}): ExtensionPack {
    return {
        ...metadata("lifecycle"),
        configure: sdm => {

            const optsToUse: LifecycleOptions = _.merge(DefaultLifecycleRenderingOptions, options);

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
            sdm.addEvent(notifyMentionedOnIssueComment());
            sdm.addEvent(notifyMentionedOnPullRequestComment());

            sdm.addEvent(commentToIssueCommentLifecycle(optsToUse.comment.chat));
            sdm.addEvent(commentToPullRequestCommentLifecycle(optsToUse.comment.chat));
            sdm.addEvent(issueToIssueCommentLifecycle(optsToUse.comment.chat));
            sdm.addEvent(pullRequestToPullRequestCommentLifecycle(optsToUse.comment.chat));

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
            sdm.addEvent(notifyMentionedOnPullRequest());

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

            // Preferences
            sdm.addCommand(adaptHandleCommand(ConfigureDirectMessageUserPreferences));
            sdm.addCommand(adaptHandleCommand(ConfigureLifecyclePreferences));
            sdm.addCommand(adaptHandleCommand(SetTeamPreference));
            sdm.addCommand(adaptHandleCommand(SetUserPreference));

            // Sdm
            sdm.addCommand(adaptHandleCommand(UpdateSdmGoalState));
            sdm.addCommand(adaptHandleCommand(UpdateSdmGoalDisplayState));
            sdm.addCommand(cancelGoalSetsCommand(sdm));

            // Slack
            sdm.addCommand(adaptHandleCommand(AddBotToChannel));
            sdm.addCommand(adaptHandleCommand(AssociateRepo));
            sdm.addCommand(adaptHandleCommand(cancelConversation));
            sdm.addCommand(adaptHandleCommand(CreateChannel));
            sdm.addCommand(adaptHandleCommand(LinkOwnerRepo));
            sdm.addCommand(adaptHandleCommand(LinkRepo));
            sdm.addCommand(adaptHandleCommand(ListRepoLinks));
            sdm.addCommand(adaptHandleCommand(NoLinkRepo));
            sdm.addCommand(adaptHandleCommand(ToggleCustomEmojiEnablement));
            sdm.addCommand(adaptHandleCommand(ToggleDisplayFormat));
            sdm.addCommand(adaptHandleCommand(UnlinkRepo));

            // Install contributed commands
            (optsToUse.commands || []).forEach(sdm.addCommand);
        },
    };
}
