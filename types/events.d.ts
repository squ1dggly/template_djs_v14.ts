import { Client, ClientEvents, Message } from "discord.js";

export interface EventCallback {
    /** Name of the event. *Used for error logging.* */
    name: string;
    /** Type of event to bind to the appropriate client event. */
    eventType: keyof ClientEvents;
    /** Whether this event will be executed or not. ***Default: true*** */
    enabled?: boolean;
    /** The asyncrous function to be executed. */
    execute: (client: Client, ...args: any[]) => Promise<Message | void | null>;
}

export interface EventCallbackConst {
    cb: EventCallback;
}
