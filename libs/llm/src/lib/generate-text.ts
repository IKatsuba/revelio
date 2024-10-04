import { openai } from '@ai-sdk/openai';
import { generateText as __generateText, CoreMessage } from 'ai';

import { env } from '@revelio/env/server';

import { getCryptoRate } from './tools/get-crypto-rate';
import { moderateContent } from './tools/moderate-content';

export async function generateText(messages: Array<CoreMessage>) {
  return __generateText({
    model: openai('gpt-4o-mini', {
      structuredOutputs: true,
    }),
    temperature: env.TEMPERATURE,
    messages,
    system: env.ASSISTANT_PROMPT,
    maxSteps: 2,
    tools: {
      getCryptoRate,
      moderateContent,
    },
  });
}
