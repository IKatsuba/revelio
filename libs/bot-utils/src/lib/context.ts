import { Context, SessionFlavor } from 'grammy';

export interface SessionData {
  plan?: 'free' | 'basic' | 'premium';
}

export type BotContext = Context &
  SessionFlavor<SessionData> & {
    transcription?: string;
  };
