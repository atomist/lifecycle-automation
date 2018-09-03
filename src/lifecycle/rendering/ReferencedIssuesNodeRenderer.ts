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
    Action,
    Attachment,
    SlackMessage,
} from "@atomist/slack-messages";
import {
    extractLinkedIssues,
    issueUrl,
    prUrl,
    truncateCommitMessage,
} from "../../util/helpers";
import {
    AbstractIdentifiableContribution,
    RendererContext,
    SlackNodeRenderer,
} from "../Lifecycle";

export class ReferencedIssuesNodeRenderer extends AbstractIdentifiableContribution
    implements SlackNodeRenderer<any> {

    constructor() {
        super("referencedissues");
    }

    public supports(node: any): boolean {
        return node.body || node.commits;
    }

    public render(node: any, actions: Action[], msg: SlackMessage, context: RendererContext):
        Promise<SlackMessage> {
        const repo = context.lifecycle.extract("repo");
        const issues = [];

        let message;
        const ignore: string[] = [];
        if (node.body) {
            message = node.body;
        } else if (node.commits) {
            message = node.commits.map(c => c.message).join("\n");
            if (context.has("open_pr")) {
                ignore.push(context.get("open_pr"));
            }
            if (context.has("issues")) {
                ignore.push(...context.get("issues"));
            }
        }

        return extractLinkedIssues(message, repo, ignore, context.context)
            .then(ri => {
                ri.issues.forEach(i => {
                    if (issues.indexOf(i.number) < 0) {
                        // tslint:disable-next-line:variable-name
                        const author_name = `#${i.number}: ${truncateCommitMessage(i.title, repo)}`;
                        const attachment: Attachment = {
                            author_name,
                            author_icon: `https://images.atomist.com/rug/issue-${i.state}.png`,
                            author_link: issueUrl(i.repo, i),
                            fallback: author_name,
                        };
                        msg.attachments.push(attachment);
                        issues.push(i.number);
                    }
                });
                ri.prs.forEach(pr => {
                    if (issues.indexOf(pr.number) < 0) {
                        const state = (pr.state === "closed" ? (pr.merged ? "merged" : "closed") : "open");
                        // tslint:disable-next-line:variable-name
                        const author_name = `#${pr.number}: ${truncateCommitMessage(pr.title, repo)}`;
                        const attachment: Attachment = {
                            author_name,
                            author_icon: `https://images.atomist.com/rug/pull-request-${state}.png`,
                            author_link: prUrl(pr.repo, pr),
                            fallback: author_name,
                        };
                        msg.attachments.push(attachment);
                        issues.push(pr.number);
                    }
                });
                /* if (ri.showMore) {
                    const attachment: Attachment = {
                        author_name: "Show more...",
                        author_link: issueUrl(repo, node),
                        fallback: "Show more..."
                    }
                    msg.attachments.push(attachment);
                } */
                return Promise.resolve(msg);
            });
    }
}
