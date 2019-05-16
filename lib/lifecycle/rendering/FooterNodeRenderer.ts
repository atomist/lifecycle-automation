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
    Action,
    SlackMessage,
    url,
} from "@atomist/slack-messages";
import * as base64 from "../../util/base64";
import {
    RendererContext,
    SlackNodeRenderer,
} from "../Lifecycle";

export class FooterNodeRenderer implements SlackNodeRenderer<any> {

    constructor(private readonly matches: (node: any) => boolean) { }

    public id() {
        return "footer";
    }

    public supports(node: any): boolean {
        return this.matches(node);
    }

    public render(node: any, actions: Action[], msg: SlackMessage, context: RendererContext): Promise<SlackMessage> {
        if (msg && msg.attachments && msg.attachments.length > 0) {
            const attachment = msg.attachments[msg.attachments.length - 1];
            if (!attachment.ts) {
                const date = Math.floor(new Date().getTime() / 1000);
                // attachment.footer = `<!date^${date}^Updated {date_short_pretty} at {time_secs}|${date}>`;
                attachment.ts = date;
            }

            // Render feedback url in the footer
            const feedbackUrl =
                `https://atomist.typeform.com/to/yvnyOj?message_id=${base64.encode(context.lifecycle.id)}`;
            const feedbackFooter = `${url(feedbackUrl, "Feedback")}`;
            if (attachment.footer != undefined) {
                const footer = `${attachment.footer} \u00B7 ${feedbackFooter}`;
                if (footer.length <= 300) {
                    attachment.footer = footer;
                }
            } else {
                attachment.footer = feedbackFooter;
            }

            // Make sure markdown is enabled for the footer
            if (attachment.mrkdwn_in != undefined) {
                attachment.mrkdwn_in.push("footer");
            } else {
                attachment.mrkdwn_in = ["footer"];
            }
        }
        return Promise.resolve(msg);
    }
}
