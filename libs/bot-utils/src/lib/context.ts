import { Context, SessionFlavor } from 'grammy';

export interface SessionData {
  plan?: 'free' | 'basic' | 'premium';
  language?: string;
}

export type BotContext = Context &
  SessionFlavor<SessionData> & {
    transcription?: string;
  };
