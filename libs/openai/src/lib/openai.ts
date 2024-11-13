import { createOpenAI } from '@ai-sdk/openai';
import { Context } from 'hono';
import OpenAI from 'openai';

import { BotContext } from '@revelio/bot-utils';
import { getEnv } from '@revelio/env';

export function createOpenAIClient(c: Context) {
  const env = getEnv(c);

  return new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    baseURL: env.OPENAI_API_URL,
  });
}

export function createOpenaiProvider(ctx: BotContext) {
  return createOpenAI({
    baseURL: ctx.env.OPENAI_API_URL,
    apiKey: ctx.env.OPENAI_API_KEY,
  });
}
