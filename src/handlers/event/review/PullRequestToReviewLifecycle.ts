import {
    EventFired,
    EventHandler,
    Tags,
} from "@atomist/automation-client";
import * as GraphQL from "@atomist/automation-client/graph/graphQL";
import * as _ from "lodash";
import * as graphql from "../../../typings/types";
import { ReviewLifecycleHandler } from "./ReviewLifecycle";

/**
 * Send a lifecycle message on PullRequest events.
 */
@EventHandler("Send a lifecycle message on PullRequest events",
    GraphQL.subscriptionFromFile("graphql/subscription/pullRequestToReview"))
@Tags("lifecycle", "review", "pr")
export class PullRequestToReviewLifecycle
    extends ReviewLifecycleHandler<graphql.PullRequestToReviewLifecycle.Subscription> {

    protected extractNodes(event: EventFired<graphql.PullRequestToReviewLifecycle.Subscription>):
        [graphql.PullRequestToReviewLifecycle.Reviews[], string] {

        const reviews = _.get(event, "data.PullRequest[0].reviews");
        return [reviews, new Date().getTime().toString()];
    }
}
