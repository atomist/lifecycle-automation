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
    EventFired,
    EventHandler,
    Failure,
    HandleEvent,
    HandlerContext,
    HandlerResult,
    Success,
    Tags,
} from "@atomist/automation-client";
import { subscription } from "@atomist/automation-client/graph/graphQL";
import * as graphql from "../../../typings/types";
import { buildNotification } from "../../../util/notifications";

@EventHandler("Notify pushers of failing builds in Slack", subscription("notifyPusherOnBuild"))
@Tags("lifecycle", "build", "notification")
export class NotifyPusherOnBuild implements HandleEvent<graphql.NotifyPusherOnBuild.Subscription> {

    public handle(root: EventFired<graphql.NotifyPusherOnBuild.Subscription>,
                  ctx: HandlerContext): Promise<HandlerResult> {
        const build = root.data.Build[0];
        if (build.status === "broken" || build.status === "failed") {
            return buildNotification(build, build.repo, ctx)
                .then(() => Success)
                .catch(() => Failure);
        }
        return Promise.resolve(Success);
    }
}
