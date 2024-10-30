import { generateText as __generateText, CoreMessage } from 'ai';

import { env } from '@revelio/env/server';

import { openaiProvider } from './openai';
import { generateImage } from './tools/generate-image';
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
    tools: {},
  });
}

export function generateTextFactory({
  chatId,
  messageId,
  userId,
  plan,
}: {
  chatId: number;
  messageId: number;
  userId: number;
  plan: 'free' | 'basic' | 'premium';
}) {
  const tools = {
    getCryptoRate,
    moderateContent,
    addToMemory: addToMemoryToolFactory({ chatId: chatId, messageId: messageId }),
    getFromMemory: getFromMemoryToolFactory({ chatId: chatId }),
    generateImage,
    ...reminderToolFactory({ chatId, userId }),
  };

  return (messages: Array<CoreMessage>) =>
    __generateText({
      model: openaiProvider('gpt-4o-mini', {
        structuredOutputs: true,
      }),
      temperature: env.TEMPERATURE,
      messages,
      system: env.ASSISTANT_PROMPT + `\n\nCurrent time: ${new Date().toISOString()}`,
      maxSteps: 2,
      experimental_continueSteps: true,
      tools: plan === 'free' ? {} : tools,
      experimental_telemetry: {
        isEnabled: true,
      },
    });
}
