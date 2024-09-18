import { CoreMessage } from 'ai';
import { Context, SessionFlavor } from 'grammy';

export interface SessionData {
  messages: CoreMessage[];
  plan?: string;
}

export type BotContext = Context & SessionFlavor<SessionData>;
