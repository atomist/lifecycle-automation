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

import { url } from "@atomist/slack-messages";
import { renderCommitMessage } from "../../handlers/event/push/rendering/PushCardNodeRenderers";
import * as graphql from "../../typings/types";
import {
    avatarUrl,
    tagUrl,
} from "../../util/helpers";
import {
    Action,
    CardMessage,
} from "../card";
import {
    AbstractIdentifiableContribution,
    CardNodeRenderer,
    RendererContext,
} from "../Lifecycle";

export class EventsCardNodeRenderer extends AbstractIdentifiableContribution
    implements CardNodeRenderer<any> {

    constructor(private callback: (node: any) => boolean = () => true) {
        super("events");
    }

    public supports(node: any): boolean {
        return this.callback(node);
    }

    public render(node: any, actions: Action[], msg: CardMessage, context: RendererContext):
        Promise<CardMessage> {
        const events = context.lifecycle.extract("events") as {type: string, node: any};
        const repo = context.lifecycle.extract("repo");

        if (events) {
            switch (events.type) {
                case "commit":
                    this.renderCommits(events, msg, repo);
                    break;
                case "build":
                    this.renderBuild(events, msg);
                    break;
                case "status":
                    this.renderStatus(events, msg);
                    break;
                case "tag":
                    this.renderTag(events, msg, repo);
                    break;
                case "release":
                    this.renderRelease(events, msg, repo);
                    break;
            }
        }

        return Promise.resolve(msg);
    }

    private renderRelease(events, msg: CardMessage, repo) {
        const release = events.node as graphql.ReleaseToPushLifecycle.Release;
        msg.events.push({
            icon: "css://icon-database",
            text: `${url(tagUrl(repo, release.tag),
                `Release ${release.name ? release.name : release.tag.name}`)} created`,
            ts: Date.now(),
        });
    }

    private renderTag(events, msg: CardMessage, repo) {
        const tag = events.node as graphql.TagToPushLifecycle.Tag;
        msg.events.push({
            icon: "css://icon-tag",
            text: `${url(tagUrl(repo, tag), `Tag ${tag.name}`)} created`,
            ts: Date.now(),
        });
    }

    private renderCommits(events, msg: CardMessage, repo) {
        const commits = events.node as graphql.PushFields.Commits[];
        msg.events.push(...commits.map(c => ({
            icon: avatarUrl(repo, c.author.login),
            text: renderCommitMessage(c, repo),
            ts: Date.now(),
        })));
    }

    private renderStatus(events, msg: CardMessage) {
        const status = events.node as graphql.StatusToPushLifecycle.Status;
        let icon;
        if (status.state === "success") {
            icon = "css://icon-status-check";
        } else if (status.state === "pending") {
            icon = "css://icon-status-check alert";
        } else {
            icon = "css://icon-status-check fail";
        }

        let text;
        if (status.targetUrl != null && status.targetUrl.length > 0) {
            text = `${url(status.targetUrl, status.description)}`;
        } else {
            text = `${status.description}`;
        }

        msg.events.push({
            icon,
            text,
            ts: Date.now(),
        });
    }

    private renderBuild(events, msg: CardMessage) {
        const build = events.node as graphql.BuildToPushLifecycle.Build;
        let title;
        if (isNaN(+build.name)) {
            title = build.name;
        } else {
            title = `Build #${build.name}`;
        }
        let icon;
        if (build.status === "passed") {
            icon = "css://icon-circle-check";
        } else if (build.status === "started") {
            icon = "css://icon-oval-icon alert";
        } else {
            icon = "css://icon-circle-x fail";
        }
        msg.events.push({
            icon,
            text: `${build.buildUrl ? url(build.buildUrl, title) : title} ${build.status}`,
            ts: Date.now(),
        });
    }
}
