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
    Attachment,
    SlackMessage,
} from "@atomist/slack-messages";
import {
    AbstractIdentifiableContribution,
    RendererContext,
    SlackNodeRenderer,
} from "../../../../lifecycle/Lifecycle";
import * as graphql from "../../../../typings/types";
import { chartUrlFromWorkflow } from "./ChartUrl";
import {
    circleWorkflowtoStages,
    PushTrigger,
} from "./CircleWorkflow";

export class WorkflowNodeRenderer extends AbstractIdentifiableContribution
    implements SlackNodeRenderer<graphql.PushFields.Workflow> {

    constructor() {
        super("workflow");
    }

    public supports(node: any): boolean {
        return node.config && node.provider === "circle";
    }

    public render(workflow: graphql.PushFields.Workflow, actions: Action[], msg: SlackMessage,
                  context: RendererContext): Promise<SlackMessage> {

        const push = context.lifecycle.extract("push") as graphql.PushToPushLifecycle.Push;
        const pushTrigger: PushTrigger = {
            name: push.branch,
            type: "branch", // we only trigger on branch pushes currently, though the logic here would handle tags
        };
        const chartUrl = chartUrlFromWorkflow(circleWorkflowtoStages(workflow, pushTrigger));
        if (chartUrl) {
            const attachment: Attachment = {
                author_name: "Workflow",
                author_icon: "https://images.atomist.com/rug/flow.png",
                title: "Circle CI",
                title_link: `https://circleci.com/workflow-run/${workflow.id.slice(10)}`,
                fallback: "Workflow",
                image_url: chartUrl,
            };
            msg.attachments.push(attachment);
        }
        return Promise.resolve(msg);
    }
}
