import { Context, SessionFlavor } from 'grammy';
import { CoreMessage } from 'ai';

export interface SessionData {
  messages: CoreMessage[];
}

export type BotContext = Context & SessionFlavor<SessionData>;
