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
    failure,
    HandlerResult,
    logger,
    Success,
} from "@atomist/automation-client";
import * as graphql from "../../../typings/types";
import {
    apiUrl,
    AtomistGeneratedLabel,
} from "../../../util/helpers";
import * as github from "../../command/github/gitHubApi";

export const AutoMergeLabel = "auto-merge:on-approve";
export const AutoMergeCheckSuccessLabel = "auto-merge:on-check-success";
export const AutoMergeTag = `[${AutoMergeLabel}]`;
export const AutoMergeCheckSuccessTag = `[${AutoMergeCheckSuccessLabel}]`;

export const AutoMergeMethodLabel = "auto-merge-method:";
export const AutoMergeMethods = ["merge", "rebase", "squash"];

export function autoMerge(pr: graphql.AutoMergeOnReview.PullRequest, token: string): Promise<HandlerResult> {
    if (pr) {
        // Couple of rules for auto-merging

        // 1. at least one approved review if PR isn't set to merge on successful build
        if (isPrTagged(pr, AutoMergeLabel, AutoMergeTag)) {
            if (!pr.reviews || pr.reviews.length === 0) {
                return Promise.resolve(Success);
            } else if (pr.reviews.some(r => r.state !== "approved")) {
                return Promise.resolve(Success);
            }
        }

        // 2. all status checks are successful and there is at least one check
        if (pr.head && pr.head.statuses && pr.head.statuses.length > 0) {
            if (pr.head.statuses.some(s => s.state !== "success")) {
                return Promise.resolve(Success);
            }
        } else {
            return Promise.resolve(Success);
        }

        if (isPrAutoMergeEnabled(pr)) {
            const api = github.api(token, apiUrl(pr.repo));

            return api.pullRequests.get({
                owner: pr.repo.owner,
                repo: pr.repo.name,
                number: pr.number,
            })
            .then(gpr => {
                if (gpr.data.mergeable) {
                    return api.pullRequests.merge({
                        owner: pr.repo.owner,
                        repo: pr.repo.name,
                        number: pr.number,
                        merge_method: mergeMethod(pr),
                        sha: pr.head.sha,
                        commit_title: `Auto merge pull request #${pr.number} from ${pr.repo.owner}/${pr.repo.name}`,
                    })
                    .then(() => {
                        const body = `Pull request auto merged by Atomist.

* ${reviewComment(pr)}
* ${statusComment(pr)}

[${AtomistGeneratedLabel}] [${isPrTagged(
    pr, AutoMergeCheckSuccessLabel, AutoMergeCheckSuccessTag) ? AutoMergeCheckSuccessLabel : AutoMergeLabel}]`;

                        return api.issues.createComment({
                            owner: pr.repo.owner,
                            repo: pr.repo.name,
                            number: pr.number,
                            body,
                        });
                    })
                    .then(() => {
                        return api.gitdata.deleteReference({
                            owner: pr.repo.owner,
                            repo: pr.repo.name,
                            ref: `heads/${pr.branch.name.trim()}`,
                        });
                    })
                    .then(() => Success);
                } else {
                    logger.info("GitHub returned PR as not mergeable: '%j'", gpr.data);
                    return Promise.resolve(Success);
                }
            })
            .catch(err => failure(err));
        }
    }
    return Promise.resolve(Success);
}

export function isPrAutoMergeEnabled(pr: graphql.AutoMergeOnReview.PullRequest): boolean {
    return isPrTagged(pr, AutoMergeLabel, AutoMergeTag)
        || isPrTagged(pr, AutoMergeCheckSuccessLabel, AutoMergeCheckSuccessTag);
}

function isPrTagged(pr: graphql.AutoMergeOnReview.PullRequest,
                    label: string = AutoMergeLabel,
                    tag: string = AutoMergeTag) {
    // 0. check labels
    if (pr.labels && pr.labels.some(l => l.name === label)) {
        return true;
    }

    // 1. check body and title for auto merge marker
    if (isTagged(pr.title, tag) || isTagged(pr.body, tag)) {
        return true;
    }

    // 2. PR comment that contains the merger
    if (pr.comments && pr.comments.some(c => isTagged(c.body, tag))) {
        return true;
    }

    // 3. Commit message containing the auto merge marker
    if (pr.commits && pr.commits.some(c => isTagged(c.message, tag))) {
        return true;
    }

    return false;
}

function mergeMethod(pr: graphql.AutoMergeOnReview.PullRequest): "merge" | "rebase" | "squash" {
    const methodLabel = pr.labels.find(l => l.name.startsWith(AutoMergeMethodLabel));
    if (methodLabel && methodLabel.name.includes(":")) {
        const method = methodLabel.name.split(":")[1].toLowerCase() as any;
        if (AutoMergeMethods.includes(method)) {
            return method;
        }
    }
    return "merge";
}

function isTagged(msg: string, tag: string) {
    return msg && msg.indexOf(tag) >= 0;
}

function reviewComment(pr: graphql.AutoMergeOnReview.PullRequest): string {
    if (pr.reviews && pr.reviews.length > 0) {
        return `${pr.reviews.length} approved ${pr.reviews.length > 1 ? "reviews" : "review"} by ${pr.reviews.map(
                            r => `${r.by.map(b => `@${b.login}`).join(", ")}`).join(", ")}`;
    } else {
        return "No reviews";
    }
}

function statusComment(pr: graphql.AutoMergeOnReview.PullRequest): string {
    if (pr.head && pr.head.statuses && pr.head.statuses.length > 0) {
        return `${pr.head.statuses.length} successful ${pr.head.statuses.length > 1 ? "checks" : "check"}`;
    } else {
        return "No checks";
    }
}
