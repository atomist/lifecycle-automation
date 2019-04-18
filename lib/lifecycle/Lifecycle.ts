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
    addressEvent,
    addressSlackChannels,
    CommandReferencingAction,
    configurationValue,
    EventFired,
    failure,
    Failure,
    HandlerContext,
    HandlerResult,
    isSlackMessage,
    logger,
    Maker,
    MessageClient,
    MessageOptions,
    ProjectOperationCredentials,
    Secret,
    Secrets,
    Success,
    SuccessPromise,
} from "@atomist/automation-client";
import { HandleEvent } from "@atomist/automation-client/lib/HandleEvent";
import { toFactory } from "@atomist/automation-client/lib/util/constructionUtils";
import {
    CredentialsResolver,
    DeclarationType,
    ParametersDefinition,
    resolveCredentialsPromise,
} from "@atomist/sdm";
import {
    Action,
    SlackMessage,
} from "@atomist/slack-messages";
import * as config from "config";
import * as deepmerge from "deepmerge";
import * as _ from "lodash";
import {
    LifecycleActionPreferences,
    LifecyclePreferences,
    LifecycleRendererPreferences,
} from "../handlers/event/preferences";
import {
    Action as CardAction,
    CardMessage,
    isCardMessage,
} from "./card";

export type LifecycleParametersDefinition = { orgToken: string, credentialsResolver?: CredentialsResolver }

export const LifecycleParameters: ParametersDefinition<LifecycleParametersDefinition> = {
    orgToken: {
        declarationType: DeclarationType.Secret,
        uri: Secrets.OrgToken,
    },
    credentialsResolver: {
        path: "sdm.credentialsResolver",
        required: false,
    },
};

export async function lifecycle<R>(e: EventFired<R>,
                                   params: LifecycleParametersDefinition,
                                   ctx: HandlerContext,
                                   maker: Maker<LifecycleHandler<R>>): Promise<HandlerResult> {
    const handler = toFactory(maker)();
    handler.orgToken = params.orgToken;

    const creds = await resolveEventHandlerCredentials(e, params, ctx);
    handler.credentials = creds;

    return handler.handle(e, ctx);
}

export async function resolveEventHandlerCredentials(e: EventFired<any>,
                                                     params: LifecycleParametersDefinition,
                                                     ctx: HandlerContext): Promise<ProjectOperationCredentials> {
    const credsResolver = params.credentialsResolver || configurationValue<CredentialsResolver>(
        "sdm.credentialsResolver", {
            eventHandlerCredentials: async () => {
            },
            commandHandlerCredentials: async () => {
            },
        });

    return resolveCredentialsPromise(credsResolver.eventHandlerCredentials(ctx));
}

/**
 * Base Event Handler implementation that handles rendering of lifecycle messages.
 */
export abstract class LifecycleHandler<R> implements HandleEvent<R> {

    @Secret(Secrets.OrgToken)
    public orgToken: string;

    public credentials: ProjectOperationCredentials;

    public defaultConfigurations = config.get("lifecycles") || {};

    public handle(event: EventFired<R>, ctx: HandlerContext): Promise<HandlerResult> {
        // Let the concrete handler configure the lifecycle message
        const lifecycles = this.prepareLifecycle(event, ctx);
        const preferences = this.extractPreferences(event);

        // Bail out if something isn't correctly linked up
        if (lifecycles == null || lifecycles.length === 0) {
            return Promise.resolve({ code: 0, message: "No lifecycle created" });
        }

        const results = lifecycles.map(lifecycle => {

            const channelResults = this.groupChannels(lifecycle, preferences).map(channels => {

                // Merge default and handler provided configuration
                const configuration = deepmerge(
                    this.defaultConfigurations[lifecycle.name] as LifecycleConfiguration,
                    this.prepareConfiguration(lifecycle.name, channels, preferences));

                if (configuration) {
                    lifecycle.renderers = this.configureRenderers(lifecycle.renderers, configuration,
                        lifecycle.name, channels, preferences);
                    lifecycle.contributors = this.configureContributors(lifecycle.contributors, configuration,
                        lifecycle.name, channels, preferences);
                }

                const renderers: any[] = [];
                const store = new Map<string, any>();

                lifecycle = this.processLifecycle(lifecycle, store);

                // Call all NodeRenderers and ActionContributors
                lifecycle.renderers.forEach(r => {
                    lifecycle.nodes.filter(n => r.supports(n)).forEach(n => {
                        // First collect all buttons/actions for the given node
                        const context = new RendererContext(
                            r.id(), lifecycle, configuration, this.credentials, ctx, store);

                        // Second trigger rendering
                        renderers.push(msg => {
                            return lifecycle.contributors.filter(c => c.supports(n, context)).reduce((p, f) => {
                                return p.then(actions => {
                                    return f.buttonsFor(n, context)
                                        .then(buttons => {
                                            return f.menusFor(n, context)
                                                .then(menus => {
                                                    return [...(actions || []), ...(buttons || []), ...(menus || [])];
                                                });
                                        });
                                });
                            }, Promise.resolve([]))
                                .then(actions => {
                                    return r.render(n, actions, msg, context);
                                });
                        });
                    });
                });

                return renderers.reduce((p, f) => p.then(f), this.prepareMessage(lifecycle, ctx))
                    .then(msg => {
                        return this.createAndSendMessage(msg, lifecycle, channels, ctx);
                    });
            });

            return Promise.all(channelResults);

        });

        return Promise.all(results)
            .then(resolved => {
                const error = resolved.some(r => r.some(ri => ri.code !== 0));
                return error ? Failure : Success;
            });
    }

    protected processLifecycle(lifecycle: Lifecycle, store: Map<string, any>): Lifecycle {
        return lifecycle;
    }

    protected abstract extractPreferences(event: EventFired<R>): { [teamId: string]: Preferences[] };

    /**
     * Extension point to configure nodes and rendering of those nodes for a given path expression match.
     * @param event the cortex event the path expression matched
     */
    protected abstract prepareLifecycle(event: EventFired<R>, ctx: HandlerContext): Lifecycle[];

    /**
     * Extension point to create an empty starting point for the lifecycle message.
     * @returns {any}
     */
    protected abstract prepareMessage(lifecycle: Lifecycle, ctx: HandlerContext): Promise<any>;

    private prepareConfiguration(name: string,
                                 channels: { teamId: string, channels: string[] },
                                 preferences: { [teamId: string]: Preferences[] }): LifecycleConfiguration {
        if (preferences && preferences[channels.teamId]) {
            const lifecycles = preferences[channels.teamId].find(p => p.name === "lifecycle_preferences");
            if (lifecycles && lifecycles.value) {
                try {
                    const configuration = JSON.parse(lifecycles.value)[name] as LifecycleConfiguration;
                    if (configuration) {
                        return configuration;
                    }
                } catch (err) {
                    logger.warn(`Lifecycle configuration corrupt: '${lifecycles.value}'`);
                }
            }
        }
        return {} as LifecycleConfiguration;
    }

    private createAndSendMessage(message: any,
                                 lifecycle: Lifecycle,
                                 channels: { teamId: string, channels: string[] },
                                 ctx: HandlerContext): Promise<any> {
        let ts = this.normalizeTimestamp(lifecycle.timestamp);
        if (ts == null) {
            ts = Date.now().toString();
        }

        const options: MessageOptions = {
            id: lifecycle.id,
            ttl: +lifecycle.ttl,
            ts: +ts,
            post: lifecycle.post,
        };

        if (isCardMessage(message)) {
            return this.sendCard(message, options, ctx);
        } else if (isSlackMessage(message)) {
            message.unfurl_links = false;
            message.unfurl_media = true;
            return this.sendMessage(message, options, channels, ctx.messageClient);
        }
    }

    private sendCard(card: CardMessage,
                     options: MessageOptions,
                     ctx: HandlerContext): Promise<any> {
        // Add globabl actions into the top level
        card.events.filter(e => e.actions).forEach(e => {
            e.actions.filter(a => (a as any).global).forEach(a => card.actions.push(a));
        });

        if (!card.key) {
            card.key = options.id;
        }
        if (!card.ts) {
            card.ts = options.ts;
        }
        if (!card.ttl) {
            card.ttl = options.ttl;
        }
        if (!card.post) {
            card.post = options.post;
        }

        return ctx.messageClient.send(card, addressEvent("Card"), options)
            .then(() => {
                logger.info("Sending lifecycle card '%s'", options.id);
                return Success;
            })
            .catch(failure);
    }

    private sendMessage(slackMessage: SlackMessage,
                        options: MessageOptions,
                        channels: { teamId: string, channels: string[] },
                        messageClient: MessageClient): Promise<any> {
        // Make sure we don't send empty messages
        if (slackMessage.text === null &&
            (slackMessage.attachments === null || slackMessage.attachments.length === 0)) {
            return SuccessPromise;
        }

        return messageClient.send(slackMessage, addressSlackChannels(channels.teamId, ...channels.channels), options)
            .then(() => {
                logger.info("Sending lifecycle message '%s' to channel '%s'", options.id, channels.channels.join(", "));
                return Success;
            })
            .catch(failure);
    }

    private lifecycleEnabled(lifecycle: Lifecycle,
                             channel: Channel,
                             preferences: { [teamId: string]: Preferences[] }): boolean {
        if (preferences && preferences[channel.teamId]) {
            const preference = preferences[channel.teamId].find(p => p.name === LifecyclePreferences.key);
            if (preference) {
                const preferenceValue = JSON.parse(preference.value) || {};
                if (preferenceValue[channel.name]) {
                    if (preferenceValue[channel.name][lifecycle.name] === true) {
                        return true;
                    } else if (preferenceValue[channel.name][lifecycle.name] === false) {
                        return false;
                    }
                }
            }
        }

        // Check the default
        return LifecyclePreferences[lifecycle.name].enabled;
    }

    /**
     * Clean up the list of channels; look for channels that can be processed together as they don't have
     * any configuration.
     */
    private groupChannels(lifecycle: Lifecycle,
                          preferences: { [teamId: string]: Preferences[] } = {})
        : Array<{ teamId: string, channels: string[] }> {

        if (lifecycle == null) {
            return [];
        }

        // First filter out channel / lifecycle combinations that aren't enabled
        const channels = lifecycle.channels.filter(c => c.name && c.teamId)
            .filter(channel => this.lifecycleEnabled(lifecycle, channel, preferences));

        const unconfiguredChannels: Array<{ teamId: string, channels: string[] }> = [];
        const configuredChannels: Array<{ teamId: string, channels: string[] }> = [];

        channels.forEach(c => {
            if (preferences[c.teamId] && this.channelConfigured(c,
                preferences[c.teamId].find(p => p.name === LifecycleActionPreferences.key))) {
                configuredChannels.push({ teamId: c.teamId, channels: [c.name] });
            } else if (preferences[c.teamId] && this.channelConfigured(c,
                preferences[c.teamId].find(p => p.name === LifecycleRendererPreferences.key))) {
                configuredChannels.push({ teamId: c.teamId, channels: [c.name] });
            } else {
                if (unconfiguredChannels.some(uc => uc.teamId === c.teamId)) {
                    unconfiguredChannels.find(uc => uc.teamId === c.teamId).channels.push(c.name);
                } else {
                    unconfiguredChannels.push({ teamId: c.teamId, channels: [c.name] });
                }
            }
        });

        if (unconfiguredChannels.length > 0) {
            return [...configuredChannels, ...unconfiguredChannels];
        } else {
            return configuredChannels;
        }
    }

    private channelConfigured(channel: Channel, preference: any): boolean {
        if (preference) {
            try {
                const preferenceValue = JSON.parse(preference.value) || {};
                if (preferenceValue[channel.name]) {
                    return true;
                } else {
                    return false;
                }
            } catch (e) {
                logger.error(`Failed to parse lifecycle configuration: '${preference.value}'`);
                return false;
            }
        } else {
            return false;
        }
    }

    private normalizeTimestamp(timestamp: string): string {
        try {
            const date = Date.parse(timestamp);
            if (!isNaN(date)) {
                return date.toString();
            } else {
                return timestamp;
            }
        } catch (e) {
            // ignore
        }
        return new Date().getTime().toString();
    }

    private configureContributors(contributors: Array<ActionContributor<any, any>>,
                                  configuration: LifecycleConfiguration = {} as LifecycleConfiguration,
                                  name: string,
                                  channels: { teamId: string, channels: string[] },
                                  preferences: { [teamId: string]: Preferences[] }) {
        contributors = this.filterAndSortContributions("action", contributors, configuration.contributors,
            name, channels, preferences) as Array<ActionContributor<any, any>>;
        contributors.forEach(c => {
            if (c.configure) {
                c.configure(configuration);
            }
        });
        return contributors;
    }

    private configureRenderers(renderers: Array<NodeRenderer<any, any, any>>,
                               configuration: LifecycleConfiguration = {} as LifecycleConfiguration,
                               name: string,
                               channels: { teamId: string, channels: string[] },
                               preferences: { [teamId: string]: Preferences[] }): Array<NodeRenderer<any, any, any>> {
        renderers = this.filterAndSortContributions("renderer", renderers, configuration.renderers,
            name, channels, preferences) as Array<NodeRenderer<any, any, any>>;
        renderers.forEach(c => {
            if (c.configure) {
                c.configure(configuration);
            }
        });
        return renderers;
    }

    private filterAndSortContributions(kind: "action" | "renderer",
                                       contributions: IdentifiableContribution[],
                                       configuration: string[],
                                       name: string,
                                       channels: { teamId: string, channels: string[] },
                                       preferences: { [teamId: string]: Preferences[] }): IdentifiableContribution[] {
        let preference;
        if (kind === "action" && preferences[channels.teamId]) {
            preference = preferences[channels.teamId].find(p => p.name === LifecycleActionPreferences.key);
        } else if (kind === "renderer" && preferences[channels.teamId]) {
            preference = preferences[channels.teamId].find(p => p.name === LifecycleRendererPreferences.key);
        }
        let preferenceConfiguration;
        if (kind === "action") {
            preferenceConfiguration = LifecycleActionPreferences[name] || {};
        } else if (kind === "renderer") {
            preferenceConfiguration = LifecycleRendererPreferences[name] || {};
        }
        if (preference && channels.channels.length === 1) {
            try {
                const channel = channels.channels[0];
                const preferenceValue = JSON.parse(preference.value) || {};
                if (preferenceValue[channel]) {
                    const channelPreferences = preferenceValue[channel];
                    contributions = contributions.filter(c => {
                        const channelPreference = _.get(channelPreferences, `${name}.${c.id()}`);
                        if (channelPreference != null) {
                            return channelPreference === true;
                        }
                        if (preferenceConfiguration && preferenceConfiguration[c.id()]) {
                            return preferenceConfiguration[c.id()].enabled;
                        } else {
                            return true;
                        }
                    });
                } else {
                    contributions = contributions.filter(c =>
                        preferenceConfiguration[c.id()] == null || preferenceConfiguration[c.id()].enabled);
                }
            } catch (e) {
                logger.error(`Failed to parse lifecycle configuration: '${preference.value}'`);
            }
        } else {
            contributions = contributions.filter(c =>
                preferenceConfiguration[c.id()] == null || preferenceConfiguration[c.id()].enabled);
        }

        if (configuration) {
            contributions = contributions.filter(r => configuration.indexOf(r.id()) >= 0);

            // Sort based on configuration
            contributions = contributions.sort((r1, r2) => {
                const i1 = configuration.indexOf(r1.id());
                const i2 = configuration.indexOf(r2.id());
                return i1 - i2;
            });
        }
        return contributions;
    }
}

export interface LifecycleConfiguration {

    renderers: string[];
    contributors: string[];
    configuration: any;
}

export interface ChatTeam {
    id: string;
    preferences: Preferences[];
}

export interface Preferences {
    name?: string;
    value?: string;
}

export interface Channel {
    name: string;
    teamId: string;
}

/**
 * Returned by LifecycleHandler.prepareLifecycle in order to link path expressions matches up with
 * NodeRenderer and ActionContributor.
 */
export interface Lifecycle {

    /**
     * The name of the lifecycle
     */
    name: string;

    /**
     * The id to be used to identify the lifecycle message in Slack.
     * Only lifecycle messages with matching ids are being overwritten.
     */
    id: string;

    /**
     * Timestamp of the lifecycle message. This is used to drop out-of-order messages.
     */
    timestamp: string;

    /**
     * Timestamp after which message should be re-written.
     */
    ttl?: string;

    /**
     * Indicate if this message should only be an update to an existing message
     */
    post?: "update_only" | "always";

    /**
     * The channels the lifecycle message should be send to.
     */
    channels: Channel[];

    /**
     * The cortex nodes that should be rendered.
     * The order of the nodes in the returned array determines the rendering order: the first node
     * in the array will be passed to the NodeRenderes first, etc.
     */
    nodes: any[];

    /**
     * The NodeRenderers to use for rendering.
     * The order of renderers in the returned array determines the rendering order.
     */
    renderers: Array<NodeRenderer<any, any, any>>;

    /**
     * The ActionContributor to use for adding buttons to messages.
     */
    contributors?: Array<ActionContributor<any, any>>;

    /**
     * The NodeExtractor to help extract nodes from the root
     */
    extract: (type: string) => any;
}

export interface IdentifiableContribution {

    /**
     * Unique id of this renderer
     */
    id(): string;

    /**
     * Configure the contributions with the provided configuration
     * @param {LifecycleConfiguration} config
     */
    configure?(config: LifecycleConfiguration);
}

/**
 * A NodeRenderer is responsible to render a given and supported cortex node into the provided
 * SlackMessage.
 */
export interface NodeRenderer<T, M, A> extends IdentifiableContribution {

    /**
     * Indicate if a NodeRenderer supports a provided cortex node.
     */
    supports(node: T): boolean;

    /**
     * Render the given node and actions into the given SlackMessage.
     */
    render(node: T, actions: A[], msg: M, context: RendererContext): Promise<M>;
}

export interface SlackNodeRenderer<T> extends NodeRenderer<T, SlackMessage, Action> {
}

export interface CardNodeRenderer<T> extends NodeRenderer<T, CardMessage, CardAction> {
}

/**
 * A ActionContributor can add one or multiple buttons/actions for a given cortex node.
 */
export interface ActionContributor<T, A> extends IdentifiableContribution {

    /**
     * Indicate if a ActionContributor supports a provided cortex node.
     */
    supports(node: any, context: RendererContext): boolean;

    /**
     * Create buttons for the provided node.
     */
    buttonsFor(node: T, context: RendererContext): Promise<A[]>;

    /**
     * Create menus for the provided node.
     */
    menusFor(node: T, context: RendererContext): Promise<A[]>;
}

export interface SlackActionContributor<T> extends ActionContributor<T, Action> {
}

export interface CardActionContributor<T> extends ActionContributor<T, CardAction> {
}

export class RendererContext {

    constructor(public rendererId: string,
                public lifecycle: Lifecycle,
                public configuration: LifecycleConfiguration,
                public credentials: ProjectOperationCredentials,
                public context: HandlerContext,
                private store: Map<string, any>) {
    }

    public set(key: string, value: any) {
        this.store.set(key, value);
    }

    public get(key: string) {
        return this.store.get(key);
    }

    public has(key: string) {
        return this.store.has(key);
    }
}

export abstract class AbstractIdentifiableContribution implements IdentifiableContribution {

    // tslint:disable-next-line:variable-name
    constructor(private _id: string) {
    }

    public id(): string {
        return this._id;
    }
}

export class CardActionContributorWrapper implements CardActionContributor<any> {

    constructor(private delegate: SlackActionContributor<any>) {
    }

    public supports(node: any, context: RendererContext): boolean {
        return this.delegate.supports(node, context);
    }

    public buttonsFor(node: any, context: RendererContext): Promise<CardAction[]> {
        return this.delegate.buttonsFor(node, context)
            .then(as => {
                const actions: CardAction[] = as.map(a => {
                    const cra = a as any as CommandReferencingAction;

                    const parameters = [];
                    for (const key in cra.command.parameters) {
                        if (cra.command.parameters.hasOwnProperty(key)) {
                            parameters.push({
                                name: key,
                                value: cra.command.parameters[key] ? cra.command.parameters[key].toString() : undefined,
                            });
                        }
                    }

                    const action: CardAction = {
                        text: cra.text,
                        type: "button",
                        registration: "@atomist/lifecycle-automation",
                        command: cra.command.name,
                        parameters,
                    };
                    if ((a as any).role) {
                        action.role = (a as any).role;
                    }
                    return action;
                });
                return actions as CardAction[];
            });
    }

    public menusFor(node: any, context: RendererContext): Promise<CardAction[]> {
        return this.delegate.menusFor(node, context)
            .then(as => {
                const actions: CardAction[] = as.map(a => {
                    const cra = a as any as CommandReferencingAction;

                    const parameters = [];
                    for (const key in cra.command.parameters) {
                        if (cra.command.parameters.hasOwnProperty(key)) {
                            parameters.push({
                                name: key,
                                value: cra.command.parameters[key] ? cra.command.parameters[key].toString() : undefined,
                            });
                        }
                    }

                    const action: CardAction = {
                        text: cra.text,
                        type: "menu",
                        registration: "@atomist/lifecycle-automation",
                        command: cra.command.name,
                        parameters,
                        parameterName: cra.command.parameterName,
                        parameterOptions: cra.options ? cra.options.map(o => ({
                            name: o.text,
                            value: o.value,
                        })) : undefined,
                        parameterOptionGroups: cra.option_groups ? cra.option_groups.map(o => ({
                            name: o.text,
                            options: o.options.map(op => ({
                                name: op.text,
                                value: op.value,
                            })),
                        })) : undefined,
                    };
                    if ((a as any).role) {
                        action.role = (a as any).role;
                    }
                    return action;
                });
                return actions as CardAction[];
            });
    }

    public id(): string {
        return this.delegate.id();
    }

    public configure?(configuration: LifecycleConfiguration) {
        if (this.delegate.configure) {
            this.delegate.configure(configuration);
        }
    }
}
