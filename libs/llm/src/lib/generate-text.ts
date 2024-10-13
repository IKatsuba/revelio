import { openai } from '@ai-sdk/openai';
import { generateText as __generateText, CoreMessage } from 'ai';

import { env } from '@revelio/env/server';

import { getCryptoRate } from './tools/get-crypto-rate';
import { addToMemoryToolFactory, getFromMemoryToolFactory } from './tools/memory';
import { moderateContent } from './tools/moderate-content';
import { reminderToolFactory } from './tools/reminders';

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

export function generateTextFactory({ chatId, messageId }: { chatId: number; messageId: number }) {
  return function generateText(messages: Array<CoreMessage>) {
    return __generateText({
      model: openai('gpt-4o-mini', {
        structuredOutputs: true,
      }),
      temperature: env.TEMPERATURE,
      messages,
      system: env.ASSISTANT_PROMPT,
      maxSteps: 4,
      tools: {
        getCryptoRate,
        moderateContent,
        addToMemory: addToMemoryToolFactory({ chatId: chatId, messageId: messageId }),
        getFromMemory: getFromMemoryToolFactory({ chatId: chatId }),
        createReminder: reminderToolFactory({ chatId }),
      },
    });
  };
}
