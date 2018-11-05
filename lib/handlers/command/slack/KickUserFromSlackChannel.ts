import {
    HandlerContext,
    HandlerResult,
    MappedParameter,
    MappedParameters,
    Parameter,
    Success,
} from "@atomist/automation-client";
import { ConfigurableCommandHandler } from "@atomist/automation-client/lib/decorators";
import { HandleCommand } from "@atomist/automation-client/lib/HandleCommand";
import { user } from "@atomist/slack-messages";
import { getChatIds } from "../../../util/helpers";
import { kickUserFromSlackChannel } from "./AssociateRepo";

@ConfigurableCommandHandler("Kick a user from a Slack channel", {
    autoSubmit: true,
    intent: ["kick user"],
})
export class KickUserFromSlackChannel implements HandleCommand {

    @MappedParameter(MappedParameters.SlackTeam)
    public teamId: string;

    @MappedParameter(MappedParameters.SlackChannel)
    public channelId: string;

    @Parameter({ description: "Id of the user to kick" })
    public userId: string;

    public async handle(ctx: HandlerContext): Promise<HandlerResult> {
        const users = getChatIds(this.userId);
        await ctx.messageClient.respond(`Good bye ${user(users[0])} :wave:`);
        await kickUserFromSlackChannel(ctx, this.teamId, this.channelId, users[0]);
        return Success;
    }
}