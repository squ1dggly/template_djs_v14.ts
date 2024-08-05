/** @file Reusable functions for using `console.log()`, but in 4k ultra HD retrocolor. */

import { Shard } from "discord.js";
import jt from "@utils/jsTools";
import chalk from "chalk";

import { name as PROJECT } from "@pkgJSON";
import config from "@configs";

const STARTUP_MESSAGES = [
    "Initalizing...",
    "Starting up...",
    "Revving engines...",
    "Brewing a cup of coffee...",
    "Giving the developer a pat on the back..."
];

/* - - - - - { Color Template } - - - - - */
export const colors = {
    debug: chalk.hex("#C45AB3"),
    log: chalk.hex("#9F7F95"),

    eventName: chalk.hex("#9381FF"),
    commandName: chalk.hex("#EFCD1E")
};

/* - - - - - { Shorthand } - - - - - */
const _TIMESTAMP = (): string => `[${new Date().toLocaleTimeString()}]`;

const _CLIENT = (): string => chalk.bold.gray("[CLIENT]");
const _CMD_MNGR_LOCAL = (): string => chalk.bold.gray("[ACM/LOCAL]");
const _CMD_MNGR_GLOBAL = (): string => chalk.bold.gray("[ACM/GLOBAL]");

const _IMPORTER = (): string => chalk.bold.gray("[IMPORTER]");
const _IMPORT_EVENT = (): string => chalk.bold.gray("[IMPORT/EVENT]");
const _IMPORT_COMMAND = (): string => chalk.bold.gray("[IMPORT/COMMAND]");

const _COMMAND = (): string => chalk.bold.gray("[COMMAND]");
const _EVENT = (): string => chalk.bold.gray("[EVENT]");
const _MONGO = (): string => chalk.bold.gray("[MONGO]");

const _DYNAMIC_SHARD = (shards: Shard[]): string =>
    shards?.length ? chalk.gray`(${shards.length === 1 ? "Shard:" : "Shards:"} ${shards.join(", ")})` : "";
const _SHARD_COUNT = (count: number): string => `${count ? chalk.gray(`Shards running: ${count}`) : ""}`;

/* - - - - - { Exports } - - - - - */
function contextFormatter(str: string): string {
    return str
        .replace("$_TIMESTAMP", _TIMESTAMP())

        .replace("$_CLIENT", _CLIENT())
        .replace("$_CMD_MNGR_LOCAL", _CMD_MNGR_LOCAL())
        .replace("$_CMD_MNGR_GLOBAL", _CMD_MNGR_GLOBAL())

        .replace("$_IMPORTER", _IMPORTER())
        .replace("$_IMPORT_EVENT", _IMPORT_EVENT())
        .replace("$_IMPORT_COMMAND", _IMPORT_COMMAND())

        .replace("$_COMMAND", _COMMAND())
        .replace("$_EVENT", _EVENT())
        .replace("$_MONGO", _MONGO());
}

export function debug(msg: string): void {
    console.log(contextFormatter(colors.debug.italic(chalk`${msg}`)));
}

export function error(header: string, msg: string, err: any = ""): void {
    console.error(contextFormatter(chalk`${chalk.bgRed.white("ERROR!")} ${chalk.bold.red(header)} ${msg}`), err);
}

export function log(msg: string): void {
    console.log(contextFormatter(colors.log.italic(chalk`${msg}`)));
}

export function success(msg: string): void {
    console.log(contextFormatter(chalk.greenBright(chalk`${msg}`)));
}

export const client = {
    initializing: (shards?: Shard[]): void => {
        console.log(
            `$_TIMESTAMP $_CLIENT ⏳ ${chalk.italic(jt.choice(STARTUP_MESSAGES))} $_DYNAMIC_SHARD`
                .replace("$_TIMESTAMP", _TIMESTAMP())
                .replace("$_CLIENT", _CLIENT())
                .replace("$_DYNAMIC_SHARD", _DYNAMIC_SHARD(shards || []))
        );
    },

    conecting: (shards?: Shard[]): void => {
        console.log(
            `$_TIMESTAMP $_CLIENT ⏳ ${chalk.italic("Connecting to Discord...")} $_DYNAMIC_SHARD`
                .replace("$_TIMESTAMP", _TIMESTAMP())
                .replace("$_CLIENT", _CLIENT())
                .replace("$_DYNAMIC_SHARD", _DYNAMIC_SHARD(shards || []))
        );
    },

    online: (shardCount = 0): void => {
        console.log(
            `$_TIMESTAMP $_CLIENT ✅ ${chalk.green("Successfuly connected to Discord!")} $_SHARD_COUNT`
                .replace("$_TIMESTAMP", _TIMESTAMP())
                .replace("$_CLIENT", _CLIENT())
                .replace("$_SHARD_COUNT", _SHARD_COUNT(shardCount))
        );
    },

    ready: (shards?: Shard[]): void => {
        console.log(
            `$_TIMESTAMP ${chalk`{bold {greenBright ${PROJECT}} is up and running!}`} 🎉 $_DYNAMIC_SHARD`
                .replace("$_TIMESTAMP", _TIMESTAMP())
                .replace("$_DYNAMIC_SHARD", _DYNAMIC_SHARD(shards || []))
        );
    }
};

export const importer = {
    eventImport: (name: string, path: string, enabled: boolean): void => {
        console.log(
            `$_TIMESTAMP $IMPORT_EVENT ${
                enabled
                    ? `${colors.eventName.bold(name)} ${chalk.italic.gray(path)}`
                    : chalk.strikethrough(`${chalk.bold.dim(name)} ${chalk.italic.gray(path)}`)
            }`
                .replace("$_TIMESTAMP", _TIMESTAMP())
                .replace("$IMPORT_EVENT", _IMPORT_EVENT())
        );
    },

    commandImport: (name: string, path: string, type: "prefix" | "slash" | "interaction"): void => {
        let prefix = "";

        // prettier-ignore
        switch (type) {
            case "prefix": prefix = config.client.PREFIX; break;
            case "slash": prefix = "/"; break;
            case "interaction": prefix = ""; break;
        }

        console.log(
            `$_TIMESTAMP $IMPORT_COMMAND ${colors.commandName.bold(`${prefix}${name}`)} ${chalk.italic.gray(path)}`
                .replace("$_TIMESTAMP", _TIMESTAMP())
                .replace("$IMPORT_COMMAND", _IMPORT_COMMAND())
        );
    }
};

export default {
    debug,
    error,
    log,
    success,

    client,
    importer
};
