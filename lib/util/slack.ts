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

/**
 * Make sure channel is a public or private channel.
 * DMs are not supported right now.
 *
 * @param id channel ID
 * @return true if the channel is a public channel
 */
export function isChannel(id: string): boolean {
    return id.indexOf("C") === 0 || id.indexOf("G") === 0;
}

/**
 * Determine if the chat system is Slack.
 *
 * This is a simple implementation right now in order to add basic support
 * for Microsoft Teams. In future we prefer not to use the channel id
 * format to determine the chat system, but have Atomist provide us with the
 * type of chat system in the request message.
 *
 * @param id channel ID
 * @return true if the system is Slack
 */
export function isSlack(id: string): boolean {
    return !id.includes("skype");
}
