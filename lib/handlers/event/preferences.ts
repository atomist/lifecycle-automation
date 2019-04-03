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

export const LifecyclePreferences = {

    key: "lifecycles",

    push: {
        id: "push",
        name: "Push Lifecycle",
        description: "Lifecycle messages for GitHub pushes, including builds, status etc",
        enabled: true,
    },
    issue: {
        id: "issue",
        name: "Issue Lifecycle",
        description: "Lifecycle messages for GitHub issues",
        enabled: true,
    },
    branch: {
        id: "branch",
        name: "Branch Lifecycle",
        description: "Lifecycle messages for GitHub branches",
        enabled: false,
    },
    pull_request: {
        id: "pull_request",
        name: "Pull Request Lifecycle",
        description: "Lifecycle messages for GitHub pull requests",
        enabled: true,
    },
    comment: {
        id: "comment",
        name: "Comment Lifecycle",
        description: "Lifecycle messages for GitHub issues and pull request comments",
        enabled: true,
    },
    review: {
        id: "review",
        name: "Review Lifecycle",
        description: "Lifecycle messages for GitHub pull request reviews",
        enabled: true,
    },

};

export const LifecycleActionPreferences = {

    key: "lifecycle_actions",

    push: {
        restart_build: {
            id: "restart_build",
            name: "Restart Failed Builds",
            description: "Restart a failed build on the connected CI system",
            enabled: true,
        },
        release: {
            id: "release",
            name: "Create GitHub Release",
            description: "Create a release on GitHub for the given Git tag",
            enabled: false,
        },
        new_tag: {
            id: "new_tag",
            name: "Create Git Tag",
            description: "Create a Git tag on the last commit of a push to the default branch",
            enabled: false,
        },
        tag: {
            id: "tag",
            name: "Create Git Tag from Tag",
            description: "Create a Git tag from a SemVer tag",
            enabled: false,
        },
        raise_pullrequest: {
            id: "raise_pullrequest",
            name: "Raise GitHub Pull Request",
            description: "Raise a GitHub pull request for any pushes to non-default branches",
            enabled: true,
        },
        cf_application: {
            id: "cf_application",
            name: "Manage Cloud Foundry Applications",
            description: "Start, Stop, Scale and retrieve application information for Cloud Foundry applications",
            enabled: true,
        },
        approve_goal: {
            id: "approve_goal",
            name: "Approve or Start SDM Goal",
            description: "Starts or approves an Atomist SDM goal",
            enabled: true,
        },
        display_goals: {
            id: "display_goals",
            name: "Show all Goals",
            description: "Show all goals and goal sets on a push; not just the most current one",
            enabled: true,
        },
    },

    comment: {
        details: {
            id: "details",
            name: "Details",
            description: "Show the GitHub Issue",
            enabled: true,
        },
        assign: {
            id: "assign",
            name: "Assign To Me",
            description: "Assign GitHub issues to me",
            enabled: false,
        },
        label: {
            id: "label",
            name: "Toggle Labels",
            description: "Add or remove labels to GitHub issue",
            enabled: true,
        },
        close: {
            id: "close",
            name: "Close Issue",
            description: "Close GitHub issue",
            enabled: true,
        },
        comment: {
            id: "comment",
            name: "Add Comment",
            description: "Add comment to GitHub issue and pull request",
            enabled: true,
        },
        thumps_up: {
            id: "thumps_up",
            name: "Add :+1: Reaction",
            description: "Add reaction to GitHub issue or pull request comment",
            enabled: true,
        },
    },

    issue: {
        assigntome: {
            id: "assigntome",
            name: "Assign To Me",
            description: "Assign GitHub issues to me",
            enabled: true,
        },
        assign: {
            id: "assign",
            name: "Assign",
            description: "Assign GitHub issues",
            enabled: true,
        },
        move: {
            id: "move",
            name: "Move",
            description: "Move GitHub issues",
            enabled: true,
        },
        related: {
            id: "related",
            name: "Create Related",
            description: "Create related GitHub issues",
            enabled: true,
        },
        label: {
            id: "label",
            name: "Toggle Labels",
            description: "Add or remove labels to GitHub issue",
            enabled: true,
        },
        close: {
            id: "close",
            name: "Close Issue",
            description: "Close GitHub issue",
            enabled: true,
        },
        comment: {
            id: "comment",
            name: "Add Comment",
            description: "Add comment to GitHub issue",
            enabled: true,
        },
        thumps_up: {
            id: "thumps_up",
            name: "Add :+1: Reaction",
            description: "Add reaction to GitHub issue",
            enabled: true,
        },
        reopen: {
            id: "reopen",
            name: "Reopen Issue",
            description: "Reopen GitHub issue",
            enabled: true,
        },
        more: {
            id: "more",
            name: "More",
            description: "More actions",
            enabled: true,
        },

    },

    branch: {
        raise_pullrequest: {
            id: "raise_pullrequest",
            name: "Raise GitHub Pull Request",
            description: "Raise a GitHub pull request for any pushes to non-default branches",
            enabled: true,
        },
    },

    pull_request: {
        merge: {
            id: "merge",
            name: "Merge Pull Request",
            description: "Merge GitHub pull request",
            enabled: true,
        },
        auto_merge: {
            id: "auto_merge",
            name: "Auto Merge Pull Request",
            description: "Auto merge a GitHub pull request after successful status checks and reviews",
            enabled: true,
        },
        approve: {
            id: "approve",
            name: "Approve Breaking Change",
            description: "Approve a breaking fingerprint change",
            enabled: true,
        },
        delete: {
            id: "delete",
            name: "Delete Branch",
            description: "Delete a GitHub branch",
            enabled: true,
        },
        comment: {
            id: "comment",
            name: "Add Comment",
            description: "Add comment on GitHub pull request",
            enabled: true,
        },
        thumps_up: {
            id: "thumps_up",
            name: "Add :+1: Reaction",
            description: "Add reaction to GitHub issue",
            enabled: true,
        },
        assign_reviewer: {
            id: "assign_reviewer",
            name: "Assign Pull Request Reviewer",
            description: "Assign reviewer to GitHub pull request",
            enabled: true,
        },
    },

    review: {
        comment: {
            id: "comment",
            name: "Add Comemnt",
            description: "Add comment on GitHub review",
            enabled: true,
        },
    },

};

export const LifecycleRendererPreferences = {

    key: "lifecycle_renderers",

    push: {
        workflow: {
            id: "workflow",
            name: "Workflow",
            description: "Render an updating chart of a Circle CI Workflow",
            enabled: false,
        },
        tag: {
            id: "tags",
            name: "Tag and Releases",
            description: "Render Git tags and GitHub Releases",
            enabled: true,
        },
        application: {
            id: "application",
            name: "Application Services",
            description: "Render information about running application service instances",
            enabled: true,
        },
        container: {
            id: "container",
            name: "Application Containers",
            description: "Render information about running application containers",
            enabled: true,
        },
    },

    comment: {
        attachimages: {
            id: "attachimages",
            name: "Image Attachments",
            description: "Extract image attachments from GitHub issue and pull request comments",
            enabled: true,
        },
    },

    issue: {
        attachimages: {
            id: "attachimages",
            name: "Image Attachments",
            description: "Extract image attachments from GitHub issue bodies",
            enabled: true,
        },
    },

    branch: {},

    pull_request: {
        attachimages: {
            id: "attachimages",
            name: "Image Attachments",
            description: "Extract image attachments from GitHub pull request bodies",
            enabled: true,
        },
    },

    review: {},

};

export const DirectMessagePreferences = {

    key: "dm",

    build: {
        id: "build",
        name: "Failed Builds",
        description: "DM me when my build fails",
    },
    mention: {
        id: "mention",
        name: "@-Mentions",
        description: "DM me when someone @-mentions me in issues or pull requests",
    },
    assignee: {
        id: "assignee",
        name: "Assignments",
        description: "DM me when someone assigns me an issue or pull request",
    },
    review: {
        id: "review",
        name: "Review Comments",
        description: "DM me when I get new review comments on my pull requests",
    },
    reviewee: {
        id: "reviewee",
        name: "Review Requests",
        description: "DM me when I'm asked to review a pull request",
    },
    prUpdates: {
        id: "prUpdates",
        name: "Commits to reviewed Pull Requests",
        description: "DM me when a commit is pushed to a pull request that I'm reviewing",
    },
    merge: {
        id: "merge",
        name: "Pull Request Merges",
        description: "DM me when my pull request is manually or automatically merged",
    },
    mapRepo: {
        id: "mapRepo",
        name: "Map Repository To Channel",
        description: "DM me when my commits are pushed to a repository not mapped to a chat channel",
    },

};
