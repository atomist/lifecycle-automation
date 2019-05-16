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
    AutomationContextAware,
    AutomationEventListenerSupport,
    Destination,
    guid,
    HandlerContext,
    isSlackMessage,
    logger,
    MessageClient,
    MessageOptions,
} from "@atomist/automation-client";
import {
    DefaultSlackMessageClient,
    MessageClientSupport,
} from "@atomist/automation-client/lib/spi/message/MessageClientSupport";
import { SlackMessage } from "@atomist/slack-messages";
import axios from "axios";
import * as cluster from "cluster";
import {
    CardMessage,
    isCardMessage,
} from "../lifecycle/card";
import { wrapLinks } from "./tracking";

export function shortenUrls(message: SlackMessage | CardMessage,
                            options: MessageOptions,
                            ctx: AutomationContextAware): Promise<SlackMessage | CardMessage> {

    // Check if this message was already shortened
    if (isShortened(message)) {
        return Promise.resolve(message);
    }

    if (!ctx || !ctx.context) {
        return Promise.resolve(message);
    }

    logger.debug("Starting url shortening");
    const [wrappedSlackMessage, hashesToUrl] = wrapLinks(message, ctx.context.operation);

    if (hashesToUrl.length === 0) {
        logger.debug("No urls shortened");
        return Promise.resolve(wrappedSlackMessage);
    }

    return axios.put("https://r.atomist.com/v2/shorten", {
            teamId: ctx.context.workspaceId,
            teamName: ctx.context.workspaceName,
            group: "atomist",
            artifact: ctx.context.name,
            version: ctx.context.version,
            name: ctx.context.operation,
            messageId: options && options.id ? options.id : guid(),
            redirects: hashesToUrl.map(([hash, url]) => ({ hash, url })),
        }, { timeout: 2000 })
        .then(() => {
            logger.debug("Finished url shortening");
            return markShortened(wrappedSlackMessage);
        }, err => {
            logger.warn(`Error shortening urls: '${err.message}'`);
            return markShortened(message);
        });
}

function markShortened(message: any): SlackMessage {
    if (cluster.isWorker) {
        (message).__shortened = true;
    }
    return message;
}

function isShortened(message: any): boolean {
    if ((message).__shortened === true) {
        delete (message).__shortened;
        return true;
    } else {
        return false;
    }
}

class ShortenUrlMessageClient extends MessageClientSupport {

    constructor(public messageClient: MessageClient, public ctx: HandlerContext) {
        super();
    }

    protected doSend(msg: any, destinations: Destination[], options?: MessageOptions): Promise<any> {
        if (isSlackMessage(msg) || isCardMessage(msg)) {
             return shortenUrls(msg as SlackMessage, options, (this.ctx as any) as AutomationContextAware)
                 .then(message => this.sendMessage(message, destinations, options));
        } else {
            return this.sendMessage(msg, destinations, options);
        }
    }

    private sendMessage(message: any, destinations: Destination[], options?: MessageOptions) {
        return this.messageClient.send(message, destinations, options);
    }
}

export class ShortenUrlAutomationEventListener extends AutomationEventListenerSupport {

    public contextCreated(context: HandlerContext): void {
          context.messageClient = new DefaultSlackMessageClient(
              new ShortenUrlMessageClient(context.messageClient, context), context.graphClient);
    }
}
