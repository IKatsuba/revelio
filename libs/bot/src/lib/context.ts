import { Context, SessionFlavor } from 'grammy';

export interface SessionData {
  //
}

export type BotContext = Context & SessionFlavor<SessionData>;
