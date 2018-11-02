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
    HandlerContext,
    Tags,
} from "@atomist/automation-client";
import { CommandHandler } from "@atomist/automation-client/lib/decorators";
import {
    Attachment,
    SlackMessage,
    url,
} from "@atomist/slack-messages";
import * as cf from "cf-nodejs-client";
import { AbstractCloudFoundryApplicationCommand } from "./AbstractCloudFoundryApplicationCommand";

/**
 * Get application detail of a Cloud Foundry Application.
 */
@CommandHandler("Get application detail of a Cloud Foundry Application", "cf info")
@Tags("cloudfoundry", "app")
export class CloudFoundryApplicationDetail extends AbstractCloudFoundryApplicationCommand {

    protected doWithApp(apps: cf.Apps, ctx: HandlerContext): Promise<any> {
        return apps.getSummary(this.guid)
            .then(summary => {
                if (summary.state.toLowerCase() !== "stopped") {
                    return apps.getStats(this.guid)
                        .then(stats => {
                            return ctx.messageClient.respond(this.createMessage(stats, summary));
                        });
                } else {
                    return ctx.messageClient.respond(this.createMessage(null, summary));
                }
            });
    }

    private createMessage(stats: any, summary: any): SlackMessage {
        const routes = summary.routes.map(r =>
            url(`http://${r.host}.${r.domain.name}`, `${r.host}.${r.domain.name}`)).join(", ");

        const message: SlackMessage = {
            text: `Application details for \`${summary.name}\``,
            attachments: [{
                fallback: `Application details for \`${summary.name}\``,
                mrkdwn_in: ["value"],
                footer: summary.buildpack,
                fields: [{
                    title: "Name",
                    value: summary.name,
                    short: true,
                },
                {
                    title: "Requested State",
                    value: summary.state.toLowerCase(),
                    short: true,
                },
                {
                    title: "Usage",
                    value: `${summary.memory} mb x ${summary.instances} instances`,
                    short: true,
                },
                {
                    title: "Routes",
                    value: routes,
                    short: true,
                },
                {
                    title: "Last Uploaded",
                    value: new Date(summary.package_updated_at).toString(),
                    short: true,
                },
                {
                    title: "Stack",
                    value: summary.detected_buildpack,
                    short: true,
                }],
            },
            ],
        };

        for (const key in stats) {
            if (stats.hasOwnProperty(key)) {
                const i = stats[key];
                const attachment: Attachment = {
                    fallback: `Instance details for #${key}`,
                    fields: [{
                        title: "Index",
                        value: key,
                        short: true,
                    },
                    {
                        title: "State",
                        value: i.state.toLowerCase(),
                        short: true,
                    },
                    {
                        title: "Since",
                        value: new Date(i.stats.usage.time).toString(),
                        short: true,
                    },
                    {
                        title: "CPU",
                        value: `${(i.stats.usage.cpu * 100).toFixed(1)}%`,
                        short: true,
                    },
                    {
                        title: "Memory",
                        value: `${(+i.stats.usage.mem / 1024 / 1024).toFixed(0)}M of ${summary.memory}M`,
                        short: true,
                    },
                    {
                        title: "Disk",
                        value: `${(+i.stats.usage.disk / 1024 / 1024).toFixed(0)}M of ${summary.disk_quota}M`,
                        short: true,
                    }],
                };
                message.attachments.push(attachment);
            }

        }
        return message;
    }
}
