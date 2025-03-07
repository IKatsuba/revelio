import { BaseMessage } from '@langchain/core/messages';
import { Context, SessionFlavor } from 'grammy';

import { createInjectionToken, factoryProvider, inject, provide } from '@revelio/di';

export const BOT_CONTEXT = createInjectionToken<BotContext>();

export interface SessionData {
  plan?: 'free' | 'basic' | 'premium';
  language?: string;
}

export function injectBotContext(): BotContext {
  const ctx = inject(BOT_CONTEXT);

  if (!ctx) {
    throw new Error('Bot context not found');
  }

  return ctx;
}

export function provideBotContext(ctx: BotContext): void {
  provide(
    BOT_CONTEXT,
    factoryProvider(() => ctx),
  );
}

export type BotContext = Context &
  SessionFlavor<SessionData> & {
    transcription?: string;
    photoUrl?: string;
    prompt?: BaseMessage | BaseMessage[];
  };
