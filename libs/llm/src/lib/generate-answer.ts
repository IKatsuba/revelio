import { generateText as __generateText, CoreMessage } from 'ai';
import { nanoid } from 'nanoid';

import { createKeyboardWithPaymentLinks } from '@revelio/billing';
import { BotContext, plansDescription, sendLongText } from '@revelio/bot-utils';
import { createOpenaiProvider } from '@revelio/openai';

import { generateImageFactory } from './tools/generate-image';
import { getCryptoRate } from './tools/get-crypto-rate';
import { getCurrentPlanToolFactory } from './tools/get-current-plan';
import { addToMemoryToolFactory, getFromMemoryToolFactory } from './tools/memory';
import { moderateContentFactory } from './tools/moderate-content';
import { reminderToolFactory } from './tools/reminders';
import { searchToolsFactory } from './tools/search';
import { setChatLanguageFactory } from './tools/set-chat-language';
import { ttsFactory } from './tools/tts';
import { weatherToolFactory } from './tools/weather';

export async function generateAnswer(
  ctx: BotContext,
  {
    messages,
    system,
  }: {
    messages?: Array<CoreMessage>;
    system?: string;
  },
  other?: Parameters<BotContext['reply']>[1],
) {
  const messageIds =
    messages && messages.length > 0
      ? await addToChatHistory(ctx, {
          messages,
        })
      : [];

  const allMessages = (
    ctx.session.plan === 'free'
      ? (messages ?? [])
      : messageIds && messageIds.length > 0
        ? await ctx.redis.mget<CoreMessage[]>(messageIds)
        : []
  ).filter((msg) => !!msg);

  const tools = {
    getCryptoRate,
    addToMemory: addToMemoryToolFactory(ctx),
    getFromMemory: getFromMemoryToolFactory(ctx),
    generateImage: generateImageFactory(ctx),
    textToSpeech: ttsFactory(ctx),
    setLanguage: setChatLanguageFactory(ctx),
    ...moderateContentFactory(ctx),
    ...reminderToolFactory(ctx),
    ...getCurrentPlanToolFactory(ctx),
    ...weatherToolFactory(ctx),
    ...searchToolsFactory(ctx),
  };

  const result = await __generateText<typeof tools>({
    model: createOpenaiProvider(ctx)(ctx.env.OPENAI_MODEL, {
      structuredOutputs: true,
    }),
    temperature: ctx.env.TEMPERATURE,
    messages: excludeToolResultIfItFirst(allMessages),
    system:
      system ||
      `${ctx.session.plan === 'free' ? `Always add text in the start about upgrade to paid plan. Plan descriptions: ${plansDescription}\n` : ''}${ctx.env.ASSISTANT_PROMPT}

Current time: ${new Date().toISOString()}.
Current plan: ${ctx.session.plan}
Current chat: ${ctx.chat?.title ?? 'Unknown'}
Current chat language: ${ctx.session.language ?? 'Unknown'}
`,
    maxSteps: ctx.session.plan === 'free' ? 1 : ctx.env.MAX_STEPS,
    experimental_continueSteps: true,
    tools: ctx.session.plan === 'free' ? ({} as typeof tools) : tools,
    experimental_telemetry: {
      isEnabled: true,
    },
    maxTokens: ctx.session.plan === 'free' ? 200 : ctx.env.MAX_TOKENS,
  });

  await addToChatHistory(ctx, {
    messages: result.response.messages,
  });

  const paymentKeyboard =
    ctx.session.plan === 'free' ? await createKeyboardWithPaymentLinks(ctx) : undefined;

  await sendLongText(ctx, result.text, {
    reply_markup: paymentKeyboard,
    ...other,
  });

  return result;
}

function excludeToolResultIfItFirst(messages: CoreMessage[]): CoreMessage[] {
  if (!messages.length) {
    return messages;
  }

  const message = messages[0];

  if (!message) {
    return messages.slice(1);
  }

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

  const pipeline = ctx.redis.pipeline();

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
    .lrange(`msg_list_${ctx.chatId}`, -ctx.env.MAX_HISTORY_SIZE, -1);

  for (const [id] of messagesWithId) {
    pipeline.expire(id, ctx.env.MAX_HISTORY_MESSAGE_TTL);
  }

  const [, , messageIds] = await pipeline.exec<[unknown, unknown, string[]]>();

  return messageIds;
}
