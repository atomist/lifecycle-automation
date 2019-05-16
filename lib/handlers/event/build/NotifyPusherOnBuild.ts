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
    Failure,
    GraphQL,
    Success,
} from "@atomist/automation-client";
import { EventHandlerRegistration } from "@atomist/sdm";
import { NotifyPusherOnBuild } from "../../../typings/types";
import { buildNotification } from "../../../util/notifications";

export function notifyPusherOnBuild(): EventHandlerRegistration<NotifyPusherOnBuild.Subscription> {
    return {
        name: "NotifyPusherOnBuild",
        description: "Notify pushers of failing builds as DMs",
        tags: ["lifecycle", "build", "notification"],
        subscription: GraphQL.subscription("notifyPusherOnBuild"),
        listener: async (e, ctx) => {
            const build = e.data.Build[0];
            if (build.status === "broken" || build.status === "failed") {
                try {
                    await buildNotification(build, build.repo, ctx);
                } catch (e) {
                    return Failure;
                }
            }
            return Success;
        },
    };
}
