import { track } from '@vercel/analytics/server';
import { generateText as __generateText, CoreMessage } from 'ai';

import { BotContext } from '@revelio/bot-utils';
import { env } from '@revelio/env/server';

import { openaiProvider } from './openai';
import { generateImage } from './tools/generate-image';
import { getCryptoRate } from './tools/get-crypto-rate';
import { getCurrentBillingPlanToolFactory } from './tools/get-current-billing-plan';
import { addToMemoryToolFactory, getFromMemoryToolFactory } from './tools/memory';
import { moderateContent } from './tools/moderate-content';
import { reminderToolFactory } from './tools/reminders';

export function generateText(
  ctx: BotContext,
  {
    messages,
  }: {
    messages: Array<CoreMessage>;
  },
) {
  const tools = {
    getCryptoRate,
    moderateContent,
    addToMemory: addToMemoryToolFactory(ctx),
    getFromMemory: getFromMemoryToolFactory(ctx),
    generateImage,
    ...reminderToolFactory(ctx),
    ...getCurrentBillingPlanToolFactory(ctx),
  };

  return __generateText<typeof tools>({
    model: openaiProvider('gpt-4o-mini', {
      structuredOutputs: true,
    }),
    temperature: env.TEMPERATURE,
    messages,
    system: env.ASSISTANT_PROMPT + `\n\nCurrent time: ${new Date().toISOString()}`,
    maxSteps: 2,
    experimental_continueSteps: true,
    tools: ctx.session.plan === 'free' ? ({} as typeof tools) : tools,
    experimental_telemetry: {
      isEnabled: true,
    },
    onStepFinish: async (event) => {
      for (const toolCall of event.toolCalls) {
        await track(`toolCall:${toolCall.toolName}`, {
          chatId: ctx.chatId ?? 'Unknown',
          userId: ctx.from?.id ?? 'Unknown',
          plan: ctx.session.plan ?? 'Unknown',
        });
      }

      for (const toolCall of event.toolResults) {
        await track(`toolResult:${toolCall.toolName}`, {
          chatId: ctx.chatId ?? 'Unknown',
          userId: ctx.from?.id ?? 'Unknown',
          plan: ctx.session.plan ?? 'Unknown',
        });
      }
    },
  });
}
