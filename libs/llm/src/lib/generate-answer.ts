import { track } from '@vercel/analytics/server';
import { generateText as __generateText, CoreMessage } from 'ai';
import { nanoid } from 'nanoid';

import { BotContext, sendLongText } from '@revelio/bot-utils';
import { env } from '@revelio/env/server';
import { redis } from '@revelio/redis';

import { openaiProvider } from './openai';
import { generateImageFactory } from './tools/generate-image';
import { getCryptoRate } from './tools/get-crypto-rate';
import { getCurrentBillingPlanToolFactory } from './tools/get-current-billing-plan';
import { addToMemoryToolFactory, getFromMemoryToolFactory } from './tools/memory';
import { moderateContent } from './tools/moderate-content';
import { reminderToolFactory } from './tools/reminders';
import { ttsFactory } from './tools/tts';

export async function generateAnswer(
  ctx: BotContext,
  {
    messages,
  }: {
    messages: Array<CoreMessage>;
  },
) {
  const messageIds = await addToChatHistory(ctx, {
    messages,
  });

  const allMessages = await redis.mget<CoreMessage[]>(messageIds);

  const tools = {
    getCryptoRate,
    moderateContent,
    addToMemory: addToMemoryToolFactory(ctx),
    getFromMemory: getFromMemoryToolFactory(ctx),
    generateImage: generateImageFactory(ctx),
    textToSpeech: ttsFactory(ctx),
    ...reminderToolFactory(ctx),
    ...getCurrentBillingPlanToolFactory(ctx),
  };

  const result = await __generateText<typeof tools>({
    model: openaiProvider('gpt-4o-mini', {
      structuredOutputs: true,
    }),
    temperature: env.TEMPERATURE,
    messages: excludeToolResultIfItFirst(allMessages),
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

  await addToChatHistory(ctx, {
    messages: result.response.messages,
  });

  await sendLongText(ctx, result.text);

  return result;
}

function excludeToolResultIfItFirst(messages: CoreMessage[]): CoreMessage[] {
  const message = messages[0];

  if (message.role !== 'tool') {
    return messages;
  }

  const isToolResult = message.content.some((content) => content.type === 'tool-result');

  return isToolResult ? messages.slice(1) : messages;
}

async function addToChatHistory(
  ctx: BotContext,
  {
    messages,
  }: {
    messages: Array<CoreMessage>;
  },
) {
  const messagesWithId: [string, CoreMessage][] = messages.map((message) => [
    `msg_${ctx.chatId}:${nanoid()}`,
    message,
  ]);

  const pipeline = redis.pipeline();

  pipeline
    .rpush(`msg_list_${ctx.chatId}`, ...messagesWithId.map(([id]) => id))
    .mset(
      messagesWithId.reduce((acc, [id, message]) => {
        return {
          ...acc,
          [id]: message,
        };
      }, {}),
    )
    .lrange(`msg_list_${ctx.chatId}`, -env.MAX_HISTORY_SIZE, -1);

  for (const [id] of messagesWithId) {
    pipeline.expire(id, 60 * 60 * 24 * 7);
  }

  const [, , messageIds] = await pipeline.exec<[unknown, unknown, string[]]>();

  return messageIds;
}
