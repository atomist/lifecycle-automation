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

import { isSlackMessage } from "@atomist/automation-client/spi/message/MessageClient";
import { SlackMessage } from "@atomist/slack-messages";
import * as _ from "lodash";
import * as mmh3 from "murmurhash3js";
import {
    CardMessage,
    isCardMessage,
} from "../lifecycle/card";

/**
 * Wraps all links inside the given SlackMessage with Mixpanel tracking links
 * @param message
 * @param event
 * @param teamId
 * @param messageId
 * @returns {SlackMessage}
 */
export function wrapLinks(message: SlackMessage | CardMessage, event: string):
    [SlackMessage | CardMessage, Array<[string, string]>] {

    const clonedMessage = _.cloneDeep(message);
    const hashToUrl: Array<[string, string]> = [];

    if (isCardMessage(clonedMessage)) {
        clonedMessage.title.text = wrapLinksInText(clonedMessage.title.text, `${event}/title/text`, hashToUrl);
        clonedMessage.body.text = wrapLinksInText(clonedMessage.body.text, `${event}/body/text`, hashToUrl);
        if (clonedMessage.correlations) {
            clonedMessage.correlations.forEach(c => {
                c.title = wrapLinksInText(c.title, `${event}/correlations/title`, hashToUrl);
                if (c.body) {
                    c.body.forEach(b => {
                        b.text = wrapLinksInText(b.text, `${event}/correlations/body/text`, hashToUrl);
                    });
                }
                c.link = trackableAndShortenedLink(c.link, `${event}/correlations/link`, hashToUrl);
            });
        }
        if (clonedMessage.events) {
            clonedMessage.events.forEach(e => {
                e.text = wrapLinksInText(e.text, `${event}/events/text`, hashToUrl);
            });
        }
        if (clonedMessage.collaborators) {
            clonedMessage.collaborators.forEach(e => {
                e.link = trackableAndShortenedLink(e.link, `${event}/collaborators/link`, hashToUrl);
            });
        }
    } else if (isSlackMessage(clonedMessage)) {
        clonedMessage.text = wrapLinksInText(clonedMessage.text, `${event}/text`, hashToUrl);
        if (clonedMessage.attachments) {
            clonedMessage.attachments.forEach(a => {
                a.author_link = trackableAndShortenedLink(a.author_link, `${event}/attachment/author_link`, hashToUrl);
                a.title_link = trackableAndShortenedLink(a.title_link, `${event}/attachment/title_link`, hashToUrl);

                a.footer = wrapLinksInText(a.footer, `${event}/attachment/footer`, hashToUrl);
                a.title = wrapLinksInText(a.title, `${event}/attachment/title`, hashToUrl);
                a.text = wrapLinksInText(a.text, `${event}/attachment/text`, hashToUrl);
                a.pretext = wrapLinksInText(a.pretext, `${event}/attachment/pretext`, hashToUrl);
                a.fallback = wrapLinksInText(a.fallback, `${event}/attachment/fallback`, hashToUrl);
            });
        }
    }
    return [clonedMessage, hashToUrl];
}

/**
 * Wraps a given url in a Mixpanel tracking url
 * @param url
 * @param event
 * @param teamId
 * @param messageId
 * @returns {string}
 */
export function trackableAndShortenedLink(url: string, event: string, hashToUrl: Array<[string, string]>): string {
    if (!url) {
        return url;
    }

    const [hash, shortUrl] = generateHash(url);
    hashToUrl.push([hash, url]);

    return shortUrl;
}

export function wrapLinksInText(text: string, event: string, hashToUrl: Array<[string, string]>):
    string {

    if (!text) {
        return text;
    }
    const regex = /<(https?:\/\/\S+?)(\|.+?)?>/g;
    return text.replace(regex, (m, u, n) => {
        const name = (n) ? n : `|${u}`;
        const tracker = trackableAndShortenedLink(u, event, hashToUrl);
        return `<${tracker}${name}>`;
    });
}

function generateHash(url: string): [string, string] {
    const hash = mmh3.x86.hash32(url);
    return [hash, `https://r.atomist.com/${hash}`];
}
