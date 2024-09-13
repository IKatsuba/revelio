import OpenAI from 'openai';

import { env } from '@revelio/env/server';

export const openaiClient = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});
