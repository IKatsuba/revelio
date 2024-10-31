import { track } from '@vercel/analytics/server';
import { generateText as __generateText, CoreMessage } from 'ai';

import { env } from '@revelio/env/server';

import { openaiProvider } from './openai';
import { generateImage } from './tools/generate-image';
import { getCryptoRate } from './tools/get-crypto-rate';
import { getCurrentBillingPlanToolFactory } from './tools/get-current-billing-plan';
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
    ...getCurrentBillingPlanToolFactory({ chatId }),
  };

  return (messages: Array<CoreMessage>) =>
    __generateText<typeof tools>({
      model: openaiProvider('gpt-4o-mini', {
        structuredOutputs: true,
      }),
      temperature: env.TEMPERATURE,
      messages,
      system: env.ASSISTANT_PROMPT + `\n\nCurrent time: ${new Date().toISOString()}`,
      maxSteps: 2,
      experimental_continueSteps: true,
      tools: plan === 'free' ? ({} as typeof tools) : tools,
      experimental_telemetry: {
        isEnabled: true,
      },
      onStepFinish: async (event) => {
        for (const toolCall of event.toolCalls) {
          await track(`toolCall:${toolCall.toolName}`, {
            chatId,
            userId,
            plan,
          });
        }

        for (const toolCall of event.toolResults) {
          await track(`toolResult:${toolCall.toolName}`, {
            chatId,
            userId,
            plan,
          });
        }
      },
    });
}
