/** @file Push or remove slash commands to/from guilds. */

import { InteractionCommand, SlashCommand } from "@customTypes/commands";

type PushableCommand = Array<SlashCommand | InteractionCommand>;

interface PushOptions {
    /** Specifc commands to push. */
    commands?: Array<SlashCommand | InteractionCommand>;
    /** Whether commands should register globally. */
    global?: boolean;
}

import { Client, Guild, REST, Routes } from "discord.js";
import logger from "./logger";
import jt from "./jsTools";

import { TOKEN } from "@constants";

// Create an instance of the REST API
const rest = new REST().setToken(TOKEN);

async function registerToLocal(client: Client, guildIDs: string | string[], commands?: PushableCommand) {
    guildIDs = jt.forceArray(guildIDs, { filterFalsey: true });
    commands = commands?.length
        ? commands
        : [...client.commands.slash.public.values(), ...client.commands.interaction.all.values()];
}

async function registerToGlobal(client: Client, commands?: PushableCommand) {
    if (!client.user) {
        return logger.error("$_TIMESTAMP $_APP_CMD_MNGR", "Failed to register app commands", "Client has no user property");
    }

    // If no commands are provided, use all public and interaction commands from the client.
    commands ||= [...client.commands.slash.public.values(), ...client.commands.interaction.all.values()];

    /* error */
    if (!commands.length) {
        return logger.error("$_TIMESTAMP $_APP_CMD_MNGR", "No commands found to register | op: LOCAL");
    }
}

export default {
    push: async (client: Client, guildIDs: string | string[], options?: PushOptions) => {
        /* error */
        if (!client.user) {
            return logger.error("$_TIMESTAMP $_CLIENT", "Failed to register app commands", "Client has no user property");
        }

        let guildsToPushTo = jt.forceArray(guildIDs, { filterFalsey: true });
        let global = options?.global ?? false;
        let commands = options?.commands?.length
            ? options.commands
            : [...client.commands.slash.public.values(), ...client.commands.interaction.all.values()];

        /* error */
        if (!commands.length) {
            return logger.error(
                "$_TIMESTAMP $_CLIENT",
                "Failed to register app commands",
                `No commands found! | op: ${global ? "GLOBAL" : "LOCAL"}`
            );
        }

        // Create an array of only api-serialized JSON data for each command
        let command_data = commands.map(cmd => {
            let _data = (cmd as SlashCommand)?.builder || (cmd as InteractionCommand).raw;
            return Object.hasOwn(_data, "builder") ? _data.toJSON() : _data;
        });

        /* - - - - - { Register Global } - - - - - */
        if (global) {
            logger.log("$_TIMESTAMP $_CLIENT ⏳ Registering app commands... | op: GLOBAL");

            return await rest
                .put(Routes.applicationCommands(client.user.id), { body: command_data })
                .then(() => logger.log("$_TIMESTAMP $_CLIENT ✅ Registered app commands | op: GLOBAL"))
                .catch(err => logger.error("$_TIMESTAMP $_CLIENT", "Failed to register app commands | op: GLOBAL", err));
        }

        /* - - - - - { Register Local } - - - - - */
        let guilds = (await Promise.all(guildsToPushTo.map(id => client.guilds.fetch(id).catch(() => null))))
            // Filter out guilds that don't exist
            .filter(Boolean);

        /* error */
        if (!guilds.length) {
            return logger.error(
                "$_TIMESTAMP $_CLIENT",
                "Failed to register app commands",
                "No guilds found with the given IDs"
            );
        }

        logger.log("$_TIMESTAMP $_CLIENT ⏳ Registering app commands... | op: LOCAL");

        // Iterate through each guild ID and register the commands
        return await Promise.all(
            (guilds as Guild[]).map(({ id }) =>
                rest
                    .put(Routes.applicationGuildCommands(client.user?.id || "", id), { body: command_data })
                    .catch(err =>
                        logger.error(
                            `$_TIMESTAMP $_CLIENT", "Failed to register app commands | guildID: ${id} | op: LOCAL`,
                            err
                        )
                    )
            )
        ).then(successful => {
            // Get the number of guilds that were successfully registered
            let successCount = successful.filter(Boolean).length;
            logger.log(
                `$_TIMESTAMP $_CLIENT ✅ Registered app commands for ${successCount} ${
                    successCount === 1 ? "guild" : "guilds"
                } | op: LOCAL`
            );
        });
    }
};
