import { createOpenAI } from '@ai-sdk/openai';
import OpenAI from 'openai';

import { env } from '@revelio/env/server';

export const openaiClient = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
  baseURL: env.OPENAI_API_URL,
});

export const openaiProvider = createOpenAI({
  baseURL: env.OPENAI_API_URL,
  apiKey: env.OPENAI_API_KEY,
});
