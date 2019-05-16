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
} from "@atomist/slack-messages";
import { extractImageUrls } from "../../util/helpers";
import {
    AbstractIdentifiableContribution,
    RendererContext,
    SlackNodeRenderer,
} from "../Lifecycle";

export class AttachImagesNodeRenderer extends AbstractIdentifiableContribution
    implements SlackNodeRenderer<any> {

    constructor(private readonly callback: (node: any) => boolean = () => true) {
        super("attachimages");
    }

    public supports(node: any): boolean {
        return node.body && this.callback(node);
    }

    public render(node: any, actions: Action[], msg: SlackMessage, context: RendererContext):
        Promise<SlackMessage> {

        msg.attachments.push(...extractImageUrls(node.body));
        return Promise.resolve(msg);
    }
}
