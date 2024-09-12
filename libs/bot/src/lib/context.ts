import { Context, SessionFlavor } from 'grammy';
import { CoreMessage } from 'ai';

export interface SessionData {
  messages: CoreMessage[];
  usage: {
    total: {
      promptTokens: number;
      completionTokens: number;
    };
  };
}

export type BotContext = Context & SessionFlavor<SessionData>;
