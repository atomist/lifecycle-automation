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

import { githubToSlack } from "@atomist/slack-messages/Markdown";
import {
    Action,
    Attachment,
    bold,
    SlackMessage,
    url,
} from "@atomist/slack-messages/SlackMessages";
import {
    AbstractIdentifiableContribution,
    RendererContext,
    SlackNodeRenderer,
} from "../../../../lifecycle/Lifecycle";
import {
    avatarUrl,
    issueUrl,
    linkGitHubUsers,
    linkIssues,
    removeMarkers,
    repoAndlabelsAndAssigneesFooter,
    userUrl,
} from "../../../../util/helpers";

export class IssueNodeRenderer extends AbstractIdentifiableContribution
    implements SlackNodeRenderer<any> {

    constructor() {
        super("issue");
    }

    public supports(node: any): boolean {
        return node.title;
    }

    public render(node: any, actions: Action[], msg: SlackMessage, context: RendererContext): Promise<SlackMessage> {
        const repo = context.lifecycle.extract("repo");
        let color;
        let pretext;
        let fallback;
        // tslint:disable-next-line:variable-name
        let footer_icon;

        const title = `${bold(url(issueUrl(repo, node), `#${node.number.toString()}: ${node.title}`))}`;
        if (node.state === "open") {
            color = "#6cc644";
            footer_icon = "https://images.atomist.com/rug/issue-open.png";
            if (node.createdAt === node.updatedAt) {
                pretext = `New issue ${title}`;
                fallback = `New issue #${node.number.toString()}: ${node.title}`;
            } else {
                pretext = `Updated issue ${title}`;
                fallback = `Updated issue #${node.number.toString()}: ${node.title}`;
            }
        } else if (node.state === "closed") {
            color = "#bd2c00";
            footer_icon = "https://images.atomist.com/rug/issue-closed.png";
            if (node.closedAt === node.updatedAt) {
                if (node.closedBy != null && node.closedBy.login != null) {
                    pretext = `${url(userUrl(repo, node.closedBy.login),
                        `@${node.closedBy.login}`)} closed issue ${title}`;
                } else {
                    pretext = `Closed issue ${title}`;
                }
            } else {
                pretext = `Updated issue ${title}`;
            }
        }

        // tslint:disable-next-line:variable-name
        let author_name;
        // tslint:disable-next-line:variable-name
        let author_link;
        // tslint:disable-next-line:variable-name
        let author_icon;

        if (node.openedBy != null && node.openedBy.login != null) {
            const author = node.openedBy.login;
            author_name = `@${author}`;
            author_link = userUrl(repo, author);
            author_icon = avatarUrl(repo, author);
        }

        return linkGitHubUsers(githubToSlack(node.body), context.context)
            .then(body => {
                const attachment: Attachment = {
                    color,
                    pretext,
                    text: node.state !== "closed" ? removeMarkers(linkIssues(body, repo)) : undefined,
                    author_name,
                    author_icon,
                    author_link,
                    fallback,
                    mrkdwn_in: ["text", "pretext"],
                    footer: repoAndlabelsAndAssigneesFooter(repo, node.labels, node.assignees),
                    footer_icon,
                    actions,
                };
                msg.attachments.push(attachment);
                return Promise.resolve(msg);
            });
    }
}

export class MoreNodeRenderer extends AbstractIdentifiableContribution
    implements SlackNodeRenderer<any> {

    constructor() {
        super("more");
    }

    public supports(node: any): boolean {
        return node.title;
    }

    public render(node: any, actions: Action[], msg: SlackMessage, context: RendererContext): Promise<SlackMessage> {
        if (context.has("show_more") && actions.length > 0) {
            msg.attachments.push({
                fallback: "More Actions",
                actions,
            });
        }
        return Promise.resolve(msg);
    }
}
