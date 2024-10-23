import { generateText as __generateText, CoreMessage } from 'ai';

import { env } from '@revelio/env/server';

import { openaiProvider } from './openai';
import { getCryptoRate } from './tools/get-crypto-rate';
import { addToMemoryToolFactory, getFromMemoryToolFactory } from './tools/memory';
import { moderateContent } from './tools/moderate-content';
import { reminderToolFactory } from './tools/reminders';

export async function generateText(messages: Array<CoreMessage>) {
  return __generateText({
    model: openaiProvider('gpt-4o-mini', {
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

export function generateTextFactory({
  chatId,
  messageId,
  userId,
}: {
  chatId: number;
  messageId: number;
  userId: number;
}) {
  return function generateText(messages: Array<CoreMessage>) {
    return __generateText({
      model: openaiProvider('gpt-4o-mini', {
        structuredOutputs: true,
      }),
      temperature: env.TEMPERATURE,
      messages,
      system: env.ASSISTANT_PROMPT + `\n\nCurrent time: ${new Date().toISOString()}`,
      maxSteps: 10,
      experimental_continueSteps: true,
      tools: {
        getCryptoRate,
        moderateContent,
        addToMemory: addToMemoryToolFactory({ chatId: chatId, messageId: messageId }),
        getFromMemory: getFromMemoryToolFactory({ chatId: chatId }),
        ...reminderToolFactory({ chatId, userId }),
      },
    });
  };
}
