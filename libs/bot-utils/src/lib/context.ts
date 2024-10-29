import { CoreMessage } from 'ai';
import { Context, SessionFlavor } from 'grammy';

export interface SessionData {
  messages: CoreMessage[];
  plan?: 'free' | 'basic' | 'premium';
}

export type BotContext = Context &
  SessionFlavor<SessionData> & {
    request: Request;
  };
