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

import axios from "axios";

export function retrieveToken(apiUrl: string,
                              owner: string,
                              repo: string,
                              githubToken: string): Promise<{ tld: string, token: string }> {
    let tld = "com";
    return axios.get(`${apiUrl}repos/${owner}/${repo}`,
        { headers: { Authorization: `token ${githubToken}` } })
        .then(result => {
            return result.data.private as boolean;
        })
        .then(flag => {
            tld = flag ? "com" : "org";
        })
        .then(() => {
            return axios.post(`https://api.travis-ci.${tld}/auth/github`,
                { github_token: githubToken },
                {
                    headers: {
                        "Accept":   "application/vnd.travis-ci.2+json",
                        "Content-Type": "application/json",
                        "User-Agent": "Travis/1.6.8",
                    },
                });
        })
        .then(response => {
            return { tld, token: response.data.access_token };
        });
}
