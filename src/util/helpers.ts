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

import { HandlerContext } from "@atomist/automation-client";
import { logger } from "@atomist/automation-client/internal/util/logger";
import * as slack from "@atomist/slack-messages/SlackMessages";
import * as _ from "lodash";
import { DefaultGitHubApiUrl, DefaultGitHubUrl } from "../handlers/command/github/gitHubApi";
import { DirectMessagePreferences } from "../handlers/event/preferences";
import * as graphql from "../typings/types";

/**
 * Safely truncate the first line of a commit message to 50 characters
 * or less.  Only count printable characters, i.e., not link URLs or
 * markup.
 */
export function truncateCommitMessage(message: string, repo: any): string {
    const title = (message || "").split("\n")[0];
    const escapedTitle = slack.escape(title);
    const linkedTitle = linkIssues(escapedTitle, repo);

    if (linkedTitle.length <= 50) {
        return linkedTitle;
    }

    const splitRegExp = /(&(?:[gl]t|amp);|<.*?\||>)/;
    const titleParts = linkedTitle.split(splitRegExp);
    let truncatedTitle = "";
    let addNext = 1;
    let i;
    for (i = 0; i < titleParts.length; i++) {
        let newTitle = truncatedTitle;
        if (i % 2 === 0) {
            newTitle += titleParts[i];
        } else if (/^&(?:[gl]t|amp);$/.test(titleParts[i])) {
            newTitle += "&";
        } else if (/^<.*\|$/.test(titleParts[i])) {
            addNext = 2;
            continue;
        } else if (titleParts[i] === ">") {
            addNext = 1;
            continue;
        }
        if (newTitle.length > 50) {
            const l = 50 - newTitle.length;
            titleParts[i] = titleParts[i].slice(0, l) + "...";
            break;
        }
        truncatedTitle = newTitle;
    }
    return titleParts.slice(0, i + addNext).join("");
}

/**
 * Generate GitHub repository "slug", i.e., owner/repo.
 *
 * @param repo repository with .owner and .name
 * @return owner/name string
 */
export function repoSlug(repo: any): string {
    return `${repo.owner}/${repo.name}`;
}

/**
 * Generate valid Slack channel name for a repository name.
 *
 * @param repoName valid GitHub repository name
 * @return valid Slack channel name based on repository name
 */
export function repoChannelName(repoName: string): string {
    return (repoName) ? repoName.substring(0, 21).replace(/\./g, "_").toLowerCase() : repoName;
}

export function branchUrl(repo: any, branch: string): string {
    if (isGitHub(repo)) {
        return `${htmlUrl(repo)}/${repoSlug(repo)}/tree/${branch}`;
    } else if (isBitBucketCloud(repo)) {
        return `${htmlUrl(repo)}/${repoSlug(repo)}/branch/${branch}`;
    } else if (isBitBucketOnPrem(repo)) {
        return `${htmlUrl(repo)}/projects/${repo.owner}/repos/${repo.name}/browse?at=${branch}`;
    } else if (isGitlabEnterprise(repo)) {
        return `${htmlUrl(repo)}/${repo.owner}/${repo.name}/tree/${branch}`;
    } else {
        throw new Error("Repository is missing providerType");
    }
}

export function htmlUrl(repo: any): string {
    if (repo.org && repo.org.provider && repo.org.provider.url) {
        let providerUrl = repo.org.provider.url;
        if (providerUrl.slice(-1) === "/") {
            providerUrl = providerUrl.slice(0, -1);
        }
        return providerUrl;
    } else {
        return "https://github.com";
    }
}

export function commitIcon(repo: any): string {
    if (isGitHub(repo)) {
        return "https://images.atomist.com/rug/github_grey.png";
    } else if (isBitBucket(repo)) {
        return "https://images.atomist.com/rug/bitbucket.png";
    } else if (isGitlab(repo)) {
        return "https://images.atomist.com/rug/gitlab_grey.png";
    } else {
        return "https://images.atomist.com/rug/commit.png";
    }
}

export function apiUrl(repo: any): string {
    if (repo.org && repo.org.provider && repo.org.provider.url) {
        let providerUrl = repo.org.provider.apiUrl;
        if (providerUrl.slice(-1) === "/") {
            providerUrl = providerUrl.slice(0, -1);
        }
        return providerUrl;
    } else {
        return DefaultGitHubApiUrl;
    }
}

export function repoUrl(repo: any): string {
    if (isBitBucketOnPrem(repo)) {
        return `${htmlUrl(repo)}/projects/${repo.owner}/repos/${repo.name}`;
    } else if (isGitlabEnterprise(repo)) {
        return `${htmlUrl(repo)}/${repo.owner}/${repo.name}`;
    } else {
        return `${htmlUrl(repo)}/${repoSlug(repo)}`;
    }
}

export function repoSlackLink(repo: any): string {
    return slack.url(repoUrl(repo), repoSlug(repo));
}

export function userUrl(repo: any, login: string): string {
    if (isGitHub(repo) || isBitBucketCloud(repo) || isGitlab(repo)) {
        return `${htmlUrl(repo)}/${login}`;
    } else if (isBitBucketOnPrem(repo)) {
        return `${htmlUrl(repo)}/users/${login}`;
    } else {
        throw new Error("Repository is missing providerType");
    }
}

export function avatarUrl(repo: any, login: string, url?: string): string {
    if (isGitHubCom(repo)) {
        return `https://avatars.githubusercontent.com/${login}`;
    } else if (isGitHub(repo)) {
        return `${htmlUrl(repo)}/avatars/${login}`;
    } else if (isGitlab(repo) && url) {
        return url;
    } else if (isBitBucket(repo)) {
        // https://bitbucket.org/account/cdupuis/avatar/64/?ts=1523010025
        return `${htmlUrl(repo)}/account/${login}/avatar/16`;
    }
    return `https://github.com/identicons/${login}.png`;
}
export function commitUrl(repo: any, commit: any): string {
    if (isGitHub(repo)) {
        return `${htmlUrl(repo)}/${repoSlug(repo)}/commit/${commit.sha}`;
    } else if (isBitBucketCloud(repo)) {
        return `${htmlUrl(repo)}/${repoSlug(repo)}/commits/${commit.sha}`;
    } else if (isBitBucketOnPrem(repo)) {
        return `${htmlUrl(repo)}/projects/${repo.owner}/repos/${repo.name}/commits/${commit.sha}`;
    } else if (isGitlabEnterprise(repo)) {
        return `${htmlUrl(repo)}/${repo.owner}/${repo.name}/commit/${commit.sha}`;
    } else {
        throw new Error("Repository is missing providerType");
    }
}

export function tagUrl(repo: any, tag: any): string {
    if (isGitlabEnterprise(repo)) {
        return `${htmlUrl(repo)}/${repo.owner}/${repo.name}/tags/${tag.name}`;
    } else {
        return `${htmlUrl(repo)}/${repoSlug(repo)}/releases/tag/${tag.name}`;
    }
}

export function prUrl(repo: any, pr: any): string {
    if (isGitHub(repo)) {
        return `${htmlUrl(repo)}/${repoSlug(repo)}/pull/${pr.number}`;
    } else if (isBitBucket(repo)) {
        // https://bitbucket.org/slimslenderslacks/jimtest/pull-requests/1
        return `${htmlUrl(repo)}/${repoSlug(repo)}/pull-requests/${pr.number}`;
    } else if (isGitlab(repo)) {
        return `${htmlUrl(repo)}/${repo.owner}/${repo.name}/merge_requests/${pr.number}`;
    } else {
        throw new Error("Repository is missing providerType");
    }
}

export function reviewUrl(repo: any, pr: any, review: any): string {
    // https://github.com/atomisthqa/ddmvc1/pull/16/files/c29e7289c777c36ebeb11790a00310b4b3527988
    return `${htmlUrl(repo)}/${repoSlug(repo)}/pull/${pr.number}/files/${pr.head.sha}`;
}

export function issueUrl(repo: any, issue: any, comment?: any): string {
    if (comment == null) {
        return `${htmlUrl(repo)}/${repoSlug(repo)}/issues/${issue.number}`;
    } else {
        return `${htmlUrl(repo)}/${repoSlug(repo)}/issues/${issue.number}#issuecomment-${comment.gitHubId}`;
    }
}

export function labelUrl(repo: any, label: string): string {
    // https://github.com/atomisthq/spring-team-handlers/labels/bug
    return `${htmlUrl(repo)}/${repoSlug(repo)}/labels/${label}`;
}

export function isGitHubCom(repo: any): boolean {
    return repo.org != null &&
        repo.org.provider != null &&
        repo.org.provider.providerType != null &&
        repo.org.provider.providerType === "github_com";
}

export function isGitHub(repo: any): boolean {
    return repo.org != null &&
        repo.org.provider != null &&
        repo.org.provider.providerType != null &&
        (repo.org.provider.providerType === "github_com" || repo.org.provider.providerType === "ghe");
}

export function isBitBucket(repo: any): boolean {
    return isBitBucketCloud(repo) || isBitBucketOnPrem(repo);
}

export function isGitlab(repo: any): boolean {
    return isGitlabEnterprise(repo);
}

export function isBitBucketCloud(repo: any): boolean {
    return repo.org != null &&
        repo.org.provider != null &&
        repo.org.provider.providerType != null &&
        repo.org.provider.providerType === "bitbucket_cloud";
}

export function isGitlabEnterprise(repo: any): boolean {
    return repo.org != null &&
        repo.org.provider != null &&
        repo.org.provider.providerType != null &&
        repo.org.provider.providerType === "gitlab";
}

export function isBitBucketOnPrem(repo: any): boolean {
    return repo.org != null &&
        repo.org.provider != null &&
        repo.org.provider.providerType != null &&
        repo.org.provider.providerType === "bitbucket";
}

export const AtomistGeneratedLabel = "atomist:generated";

export function isGenerated(node: graphql.PullRequestToPullRequestLifecycle.PullRequest): boolean {
    if (node && node.labels && node.labels.some(l => l === AtomistGeneratedLabel)) {
        return true;
    }
    if (node && node.body && node.body.indexOf(`[${AtomistGeneratedLabel}]`) >= 0) {
        return true;
    }
    if (node && node.title && node.title.indexOf(`[${AtomistGeneratedLabel}]`) >= 0) {
        return true;
    }
    return false;
}

/**
 * If the URL is of an image, return a Slack message attachment that
 * will render that image.  Otherwise return null.
 *
 * @param url full URL
 * @return Slack message attachment for image or null
 */
function urlToImageAttachment(url: string): slack.Attachment {
    const imageRegExp = /[^\/]+\.(?:png|jpe?g|gif|bmp)$/i;
    const imageMatch = imageRegExp.exec(url);
    if (imageMatch) {
        const image = imageMatch[0];
        return {
            text: image,
            image_url: url,
            fallback: image,
        };
    } else {
        return null;
    }
}

/**
 * Find image URLs in a message body, returning an array of Slack
 * message attachments, one for each image.  It expects the message to
 * be in Slack message markup.
 *
 * @param body message body
 * @return array of Slack message Attachments with the `image_url` set
 *         to the URL of the image and the `text` and `fallback` set
 *         to the image name.
 */
export function extractImageUrls(body: string): slack.Attachment[] {
    const slackLinkRegExp = /<(https?:\/\/.*?)(?:\|.*?)?>/g;
    // inspired by https://stackoverflow.com/a/6927878/5464956
    const urlRegExp = /\bhttps?:\/\/[^\s<>\[\]]+[^\s`!()\[\]{};:'".,<>?«»“”‘’]/gi;
    const attachments: slack.Attachment[] = [];
    const bodyParts = body.split(slackLinkRegExp);
    for (let i = 0; i < bodyParts.length; i++) {
        if (i % 2 === 0) {
            let match: RegExpExecArray;
            // tslint:disable-next-line:no-conditional-assignment
            while (match = urlRegExp.exec(bodyParts[i])) {
                const url = match[0];
                const attachment = urlToImageAttachment(url);
                if (attachment) {
                    attachments.push(attachment);
                }
            }
        } else {
            const url = bodyParts[i];
            const attachment = urlToImageAttachment(url);
            if (attachment) {
                attachments.push(attachment);
            }
        }
    }
    const uniqueAttachments: slack.Attachment[] = [];
    attachments.forEach(a => {
        if (!uniqueAttachments.some(ua => ua.image_url === a.image_url)) {
            uniqueAttachments.push(a);
        }
    });
    return uniqueAttachments;
}

export function extractLinkedIssues(body: string,
                                    repo: any,
                                    ignore: string[] = [],
                                    ctx: HandlerContext): Promise<ReferencedIssues> {
    const promises = [];

    let match;
    let counter = 0;

    // tslint:disable-next-line:no-conditional-assignment
    while (match = issueMentionRegExp.exec(body)) {
        if (counter > 2) {
            break;
        }

        const o = match[1] || repo.owner;
        const r = match[2] || repo.name;
        const no = match[3];

        if (ignore.indexOf(`${o}/${r}#${no}`) < 0) {
            promises.push(loadIssueOrPullRequest(o, r, [no], ctx)
                .then(result => {
                    const results = [];
                    if (result && result.repo) {
                        result.repo.forEach(rr => {
                            if (rr.issue) {
                                rr.issue.forEach(i => {
                                    results.push({ type: "issue", result: i });
                                });
                            }
                            if (rr.pullRequest) {
                                rr.pullRequest.forEach(pr => {
                                    results.push({ type: "pr", result: pr });
                                });
                            }
                        });
                    }
                    return results;
                }));
            counter++;
        }
    }

    return Promise.all(promises)
        .then(results => {
            const all = _.flatten(results.filter(r => r && r.length > 0));
            const issues = all.filter(r => r.type === "issue").map(r => r.result);
            const prs = all.filter(r => r.type === "pr").map(r => r.result);
            return new ReferencedIssues(issues, prs);
        });
}

export function loadIssueOrPullRequest(owner: string,
                                       repo: string,
                                       names: string[],
                                       ctx: HandlerContext): Promise<graphql.IssueOrPr.Org> {
    return ctx.graphClient.query<graphql.IssueOrPr.Query, graphql.IssueOrPr.Variables>({
        name: "issueOrPr",
        variables: {
            owner,
            repo,
            names,
        },
    })
        .then(result => {
            if (result && result.Org && result.Org.length > 0) {
                return result.Org[0];
            } else {
                return null;
            }
        })
        .catch(err => {
            logger.error("Error occurred running GraphQL query: %s", err);
            return null;
        });
}

/**
 * Find issue mentions in body and replace them with links.
 *
 * @param body message to modify
 * @param repo repository information
 * @return string with issue mentions replaced with links
 */
export function linkIssues(body: string, repo: any): string {
    if (!body || body.length === 0) {
        return body;
    }

    const splitter = /(\[.+?\](?:\[.*?\]|\(.+?\)|:\s*http.*)|^```.*\n[\S\s]*?^```\s*\n|<.+?>)/m;
    const bodyParts = body.split(splitter);
    const baseUrl = htmlUrl(repo);

    for (let j = 0; j < bodyParts.length; j += 2) {
        let newPart = bodyParts[j];
        const allIssueMentions = getIssueMentions(newPart);
        allIssueMentions.forEach(i => {
            const iMatchPrefix = (i.indexOf("#") === 0) ? `^|\\W` : repoIssueMatchPrefix;
            const iRegExp = new RegExp(`(${iMatchPrefix})${i}(?!\\w)`, "g");
            const iSlug = (i.indexOf("#") === 0) ? `${repo.owner}/${repo.name}${i}` : i;
            const iUrlPath = iSlug.replace("#", "/issues/");
            const iLink = slack.url(`${baseUrl}/${iUrlPath}`, i);
            newPart = newPart.replace(iRegExp, `\$1${iLink}`);
        });
        bodyParts[j] = newPart;
    }

    return bodyParts.join("");
}

const gitHubUserMatch = "[a-zA-Z\\d]+(?:-[a-zA-Z\\d]+)*";

/**
 * Return a regular expression that matches as GitHub comment user
 * mention.  If no user is provided, a regular expression matching any
 * valid user it returned.
 *
 * GitHub usernames may only contain alphanumeric characters or single
 * hyphens, cannot begin or end with a hyphen, and must be 1-36
 * characters.  The maximum length is not enforced by this regular
 * expression, but rather in the getGitHubUsers function.  Mentions
 * must be preceded by an `@` symbol and must not be preceded or
 * followed by any word character.
 *
 * Because the JavaScript regular expression engine does not support
 * zero-width negative look-behind assertions, we must capture the
 * character immediately prior to the mention, unless the mention
 * happens at the beginning of the string.  If you are using this
 * regular expression in a replace, be sure to include that character
 * in the replacement.  If you are using this regular expression to
 * capture mentions, the user name will be in the third element of the
 * returned match array.
 *
 * @param user GitHub user ID to match, if not provided, match any valid user
 * @return regular expression matching user mention
 */
function gitHubUserMentionRegExp(ghUser?: string): RegExp {
    const userRegExp = (ghUser) ? ghUser : gitHubUserMatch;
    return new RegExp(`(^|\\W)(?:@|＠)(${userRegExp})(?![-\\w]|\\.\\w)`, "g");
}

export function loadChatIdByGitHubId(ctx: HandlerContext, gitHubIds: string[]): Promise<graphql.GitHubId.GitHubId[]> {
    if (gitHubIds && gitHubIds.length > 0) {
        return ctx.graphClient.query<graphql.GitHubId.Query, graphql.GitHubId.Variables>({
            name: "gitHubId",
            variables: {
                gitHubIds,
            },
        })
            .then(result => {
                if (result) {
                    if (result.GitHubId && result.GitHubId.length > 0) {
                        return result.GitHubId.filter(g =>
                            g.person && g.person.chatId);
                    }
                }
                return [];
            })
            .catch(err => {
                logger.error("Error occurred running GraphQL query: %s", err);
                return [];
            });
    } else {
        return Promise.resolve([]);
    }
}

export function loadGitHubIdByChatId(chatId: string, teamId: string, ctx: HandlerContext): Promise<string> {
    return ctx.graphClient.query<graphql.ChatId.Query, graphql.ChatId.Variables>({
        name: "chatId",
        variables: {
            teamId,
            chatId,
        },
    })
        .then(result => {
            if (result) {
                return _.get(result, "ChatTeam[0].members[0].person.gitHubId.login");
            }
            return null;
        })
        .catch(err => {
            logger.error("Error occurred running GraphQL query: %s", err);
            return null;
        });
}

export function loadChatIdByChatId(chatId: string, teamId: string, ctx: HandlerContext)
    : Promise<graphql.ChatId.Members> {
    return ctx.graphClient.query<graphql.ChatId.Query, graphql.ChatId.Variables>({
        name: "chatId",
        variables: {
            teamId,
            chatId,
        },
    })
        .then(result => {
            if (result) {
                return _.get(result, "ChatTeam[0].members[0]");
            }
            return null;
        })
        .catch(err => {
            logger.error("Error occurred running GraphQL query: %s", err);
            return null;
        });
}

export function loadChatTeam(teamId: string, ctx: HandlerContext): Promise<graphql.ChatTeam.ChatTeam> {
    return ctx.graphClient.query<graphql.ChatTeam.Query, graphql.ChatTeam.Variables>({
        name: "chatTeam",
        variables: {
            teamId,
        },
    })
        .then(result => {
            return _.get(result, "ChatTeam[0]");
        })
        .catch(err => {
            logger.error("Error occurred running GraphQL query: %s", err);
            return null;
        });
}

export interface ChatId {
    id?: string;
    screenName?: string;
    preferences?: Preferences[];
}

export interface Preferences {
    name?: string;
    value?: string;
}

/**
 * Regular expression to find issue mentions.  There are capture
 * groups for the issue repository owner, repository name, and issue
 * number.  The capture groups for repository owner and name are
 * optional and therefore may be null, although if one is set, the
 * other should be as well.
 *
 * The rules for preceding characters is different for current repo
 * matches, e.g., "#43", and other repo matches, e.g., "some/repo#44".
 * Current repo matches allow anything but word characters to precede
 * them.  Other repo matches only allow a few other characters to
 * preceed them.
 */
const repoIssueMatchPrefix = "^|[[\\s:({]";
// tslint:disable-next-line:max-line-length
const issueMentionMatch = `(?:^|(?:${repoIssueMatchPrefix})(${gitHubUserMatch})\/(${gitHubUserMatch})|\\W)#([1-9]\\d*)(?!\\w)`;
const issueMentionRegExp = new RegExp(issueMentionMatch, "g");

/**
 * Find all issue mentions and return an array of unique issue
 * mentions as "#3" and "owner/repo#5".
 *
 * @param msg string that may contain mentions
 * @return unique list of issue mentions as #N or O/R#N
 */
export function getIssueMentions(msg: string = ""): string[] {
    const allMentions: string[] = [];
    let matches: string[];
    // tslint:disable-next-line:no-conditional-assignment
    while (matches = issueMentionRegExp.exec(msg)) {
        const owner = matches[1];
        const repo = matches[2];
        const issue = matches[3];
        const slug = (owner && repo) ? `${owner}/${repo}` : "";
        allMentions.push(`${slug}#${issue}`);
    }

    return _.uniq(allMentions);
}

/**
 * Find all valid GitHub @user mentions and return a unique list of them.
 *
 * @param msg string possibly containing GitHub user mentions
 * @return array of unique users mentioned in `msg`
 */
export function getGitHubUsers(msg: string = ""): string[] {
    const regex = gitHubUserMentionRegExp();
    const allMentions: string[] = [];
    let matches: string[];
    // tslint:disable-next-line:no-conditional-assignment
    while (matches = regex.exec(msg)) {
        const ghUser = matches[2];
        if (ghUser.length < 37) {
            allMentions.push(ghUser);
        }
    }

    return _.uniq(allMentions);
}

const MarkerExp = /(\[[a-zA-Z-]*:[a-zA-Z_\-:#()\/]*\])/gi;

export function removeMarkers(body: string): string {
    if (body) {
        return body.replace(MarkerExp, "");
    } else {
        return null;
    }
}

export function linkGitHubUsers(body: string = "", context: HandlerContext): Promise<string> {
    if (!body || body.length === 0) {
        return Promise.resolve(body);
    }

    const mentions = getGitHubUsers(body);
    return loadChatIdByGitHubId(context, mentions)
        .then(notifier => {
            if (notifier) {
                notifier.forEach(n => {
                    const mentionRegExp = gitHubUserMentionRegExp(n.login);
                    body = body.replace(mentionRegExp, "$1" + slack.user(n.person.chatId.screenName));
                });
            }
            return body;
        });
}

const PATTERNS = [
    /<@(U[0-9A-Z]*)>/g,
];

export function replaceChatIdWithGitHubId(body: string = "", teamId: string, ctx: HandlerContext): Promise<string> {
    if (!body || body.length === 0) {
        return Promise.resolve(body);
    }
    const matches = getChatIds(body);
    if (matches != null) {
        return Promise.all(matches.map(m => {
            return ctx.graphClient.query<graphql.ChatId.Query, graphql.ChatId.Variables>({
                name: "chatId",
                variables: {
                    teamId,
                    chatId: m,
                },
            })
                .then(result => {
                    if (result) {
                        const login = _.get(result, "ChatTeam[0].members[0].person.gitHubId.login");
                        const screenName = _.get(result, "ChatTeam[0].members[0].screenName");
                        if (login) {
                            body = body.split(`<@${m}>`).join(`@${login}`);
                        } else if (screenName) {
                            body = body.split(`<@${m}>`).join(screenName);
                        }
                    }
                })
                .catch(err => {
                    logger.error("Error occurred running GraphQL query: %s", err);
                    return body;
                });
        })).then(() => {
            return body;
        });
    }
    return Promise.resolve(body);
}

export function getChatIds(str: string): string[] {
    const matches = [];
    let match;
    PATTERNS.forEach(regex => {
        // tslint:disable-next-line:no-conditional-assignment
        while (match = regex.exec(str)) {
            matches.push(match[1]);
        }
    });

    return matches;
}

export function repoAndChannelFooter(repo: any): string {
    const channels = (repo.channels != null && repo.channels.length > 0 ? " - " + repo.channels.map(c =>
        slack.channel(c.channelId, c.name)).join(" ") : "");
    return `${slack.url(repoUrl(repo), repoSlug(repo))}${channels}`;
}

/**
 * Is login the issue/pr assigner?
 * @param assignable github issue or PR
 * @param {string} assigneeLogin github login
 * @returns {boolean}
 */
export function isAssigner(assignable: any, assigneeLogin: string): boolean {
    return assignable.lastAssignedBy != null ? assignable.lastAssignedBy.login === assigneeLogin : false;
}

export function isDmDisabled(chatId: ChatId, type?: string): boolean {
    if (chatId.preferences) {
        const preferences = chatId.preferences.find(p => p.name === DirectMessagePreferences.key);
        if (preferences) {
            const json = JSON.parse(preferences.value);
            if (json.disable_for_all === true) {
                return true;
            } else {
                return json[`disable_for_${type}`] === true;
            }
        }
    }
    return false;
}

export function repoAndlabelsAndAssigneesFooter(repo: any, labels: any, assignees: any[]): string {

    let footer = slack.url(repoUrl(repo), `${repo.owner}/${repo.name}`);
    if (labels != null && labels.length > 0) {
        footer += " - "
            + labels.map(l => `${slack.emoji("label")} ${l.name}`).join(" ");
    }
    if (assignees != null && assignees.length > 0) {
        footer += " - " + assignees.map(a =>
            `${slack.emoji("bust_in_silhouette")} ${a.login}`).join(" ");
    }
    return footer;
}

export class ReferencedIssues {

    constructor(public issues: graphql.IssueOrPr.Issue[],
                public prs: graphql.IssueOrPr.PullRequest[]) { }
}
