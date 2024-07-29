import { MessageCreateEventModule } from "@customTypes/events";

import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Events,
    GuildMember,
    Message,
    MessageActionRowComponentBuilder,
    PermissionResolvable,
    userMention
} from "discord.js";
import { BetterEmbed } from "@utils/discordTools";
import logger from "@utils/logger";

import config from "@configs";
import { PrefixCommandParams } from "@customTypes/commands";

function getStaffGuildAdminBypass(commandName: string): string[] {
    let _staff = config.client.staff;

    let result: string[] = [];
    let bypass = _staff.BYPASSED.find(b => b.COMMAND_NAME === commandName);

    if (_staff.IGNORES_GUILD_ADMIN.AllStaff) return [_staff.OWNER_ID, ..._staff.MEMBERS, ...(bypass ? bypass.USER_IDS : [])];
    if (_staff.IGNORES_GUILD_ADMIN.Owner) result.push(_staff.OWNER_ID);
    if (_staff.IGNORES_GUILD_ADMIN.Members) result.push(..._staff.MEMBERS);
    if (_staff.IGNORES_GUILD_ADMIN.Bypassed) result.push(...(bypass ? bypass.USER_IDS : []));

    return result;
}

function userIsStaffOrBypassable(message: Message, commandName: string): boolean {
    let _staff = config.client.staff;
    let bypass = _staff.BYPASSED.find(b => b.COMMAND_NAME === commandName);
    return [_staff.OWNER_ID, ..._staff.MEMBERS, ...(bypass ? bypass.USER_IDS : [])].includes(message.author.id);
}

function userHasGuildAdminOrBypassable(message: Message, commandName: string): boolean {
    let hasAdmin = message.member?.permissions.has("Administrator");
    let canBypass = getStaffGuildAdminBypass(commandName).includes(message.author.id);
    return hasAdmin || canBypass;
}

function hasRequiredPermissions(member: GuildMember, required: PermissionResolvable[]) {
    let has: PermissionResolvable[] = [];
    let missing: string[] = [];

    for (let perm of required) {
        if (member.permissions.has(perm)) has.push(perm);
        else missing.push(perm.toString());
    }

    return { has, missing, passed: has.length === required.length };
}

function getOptionFromMessageContent(content: string, prefix: string, flagName: string, allowSpaces: boolean = false) {
    let match: RegExpMatchArray | null;

    if (allowSpaces) {
        /* NOTE: matches until the first occurrence of the flagPrefix */
        match = content.match(new RegExp(`${flagName} (.[^${prefix}]*)`));
    } else {
        /* NOTE: matches until the first occurrence of a space */
        match = content.match(new RegExp(`${flagName} (.)`));
    }

    return match ? match[0] : null;
}

export default {
    name: "processPrefixCommand",
    eventType: Events.MessageCreate,

    execute: async (client, message) => {
        if (!message.inGuild() || !message.author || message.author.bot || !message.content) return;

        // Check if we have permission to send messages to the current channel
        if (!message.guild.members.me?.permissionsIn(message.channel).has("SendMessages")) return;

        /* - - - - - { Command Prefix } - - - - - */
        let _messageLowerCase = message.content.toLowerCase();

        // let prefix = await guildManager.fetchPrefix(message.guildId);
        let prefix = config.client.PREFIX;

        // Check if the message starts with the prefix
        let startsWithPrefix = _messageLowerCase.startsWith(prefix);

        /* fallback */
        if (!startsWithPrefix) {
            let _clientMention = userMention(client.user?.id || "");

            // Check if the message starts by mentioning the bot
            if (_messageLowerCase.startsWith(_clientMention)) {
                startsWithPrefix = true;
                prefix = _clientMention;
            } else return; // Return since no valid prefix was used
        }

        /* - - - - - { Parse the Command Message } - - - - - */
        let _contentWithoutPrefix = message.content.substring(prefix.length).trim();

        let commandName = _contentWithoutPrefix.split(" ")[0];
        if (!commandName) return;
        let cleanContent = _contentWithoutPrefix.substring(commandName.length).trim();

        // Get the command from the client, if it exists
        let prefixCommand = client.commands.prefix.all.get(commandName);
        if (!prefixCommand) return;

        /* NOTE: prefixCommand.options?.guildOnly is obsolete as prefix commands can't be used outside of guilds */

        /* - - - - - { Parse Command Options } - - - - - */
        if (prefixCommand.options) {
            let _botStaffOnly = prefixCommand.options.botStaffOnly;
            let _guildAdminOnly = prefixCommand.options.guildAdminOnly;

            let _requiredUserPerms = prefixCommand.options.requiredUserPerms;
            let _requiredClientPerms = prefixCommand.options.requiredClientPerms;

            // @config.client.staff
            // Check if the command requires the user to be part of the bot's admin team
            if (_botStaffOnly && !userIsStaffOrBypassable(message, commandName)) {
                return await new BetterEmbed({
                    color: "Orange",
                    title: "⚠️ Staff Only",
                    description: `Only the developers of ${client.user} can use this command.`
                }).send(message, { allowedMentions: { repliedUser: false }, fetchReply: false });
            }

            // Check if the command requires the user to have admin permission in the current guild
            if (_guildAdminOnly && !userHasGuildAdminOrBypassable(message, commandName)) {
                return await new BetterEmbed({
                    color: "Orange",
                    title: "⚠️ Server Admin Only",
                    description: "You must be an admin of this server to use this command."
                }).send(message, { allowedMentions: { repliedUser: false }, fetchReply: false });
            }

            // Check if the user has the required permissions in the current guild
            if (_requiredUserPerms && message.member) {
                let _permCheck = hasRequiredPermissions(message.member, _requiredUserPerms);

                if (!_permCheck.passed) {
                    return await new BetterEmbed({
                        color: "Orange",
                        title: "⚠️ Missing Permissions",
                        description: `You must have the following permissions:\n${_permCheck.missing.join(", ")}`
                    }).send(message, { allowedMentions: { repliedUser: false }, fetchReply: false });
                }
            }

            // Check if the client has the required permissions in the current guild
            if (_requiredClientPerms && message.guild.members.me) {
                let _permCheck = hasRequiredPermissions(message.guild.members.me, _requiredClientPerms);

                if (!_permCheck.passed) {
                    return await new BetterEmbed({
                        color: "Orange",
                        title: "⚠️ Missing Permissions",
                        description: `I need the following permissions:\n${_permCheck.missing.join(", ")}`
                    }).send(message, { allowedMentions: { repliedUser: false }, fetchReply: false });
                }
            }
        }

        /* - - - - - { Execute the Command } - - - - - */
        try {
            const extra: PrefixCommandParams = {
                prefix,
                commandName,
                cleanContent,
                getCommandOption: (prefix: string, name: string, allowSpaces: boolean = false) =>
                    getOptionFromMessageContent(cleanContent, prefix, name, allowSpaces)
            };

            return await prefixCommand.execute(client, message, extra).then(async message => {
                /* TODO: run code here after the command finished executing... */
            });
        } catch (err) {
            let _configSupport = config.client.support_server;

            /* NOTE: Invites the user to the support server */
            let aR_supportServer: ActionRowBuilder | undefined;
            let _inviteToSupportServer =
                _configSupport.INVITE_ON_COMMAND_ERROR &&
                _configSupport.INVITE_URL !== "" &&
                message.guildId !== _configSupport.GUILD_ID;

            if (_inviteToSupportServer) {
                // Create button ( Support Server Invite )
                let btn_serverInvite = new ButtonBuilder()
                    .setStyle(ButtonStyle.Link)
                    .setURL(_configSupport.INVITE_URL)
                    .setLabel("Support Server");

                // Create action row ( Support Server Invite )
                aR_supportServer = new ActionRowBuilder().setComponents(btn_serverInvite) as ActionRowBuilder;
            }

            // Create the embed ( Execute Error )
            let embed_executeError = new BetterEmbed({
                color: "Red",
                title: "⛔ Error",
                description: `An error occurred while using **\`${prefix}${commandName}\`**.`
            });

            // Let the user know an error occurred
            embed_executeError.send(message, {
                components: aR_supportServer as ActionRowBuilder<MessageActionRowComponentBuilder>,
                allowedMentions: { repliedUser: false },
                fetchReply: false
            });

            // prettier-ignore
            // Log the error to the console
            return logger.error(
                `$_TIMESTAMP $_COMMAND`,
                `name: ${prefix}${commandName} | guild: '${message.guildId}' | user: '${message.author.id}'`,
                err
            );
        }
    }
} as MessageCreateEventModule;
