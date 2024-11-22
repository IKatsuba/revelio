import { generateText as __generateText, CoreMessage } from 'ai';
import { nanoid } from 'nanoid';

import { createKeyboardWithPaymentLinks } from '@revelio/billing';
import {
  BotContext,
  getPlansDescription,
  injectBotContext,
  sendLongText,
} from '@revelio/bot-utils';
import { injectEnv } from '@revelio/env';
import { injectOpenaiProvider } from '@revelio/openai';
import { injectRedisClient } from '@revelio/redis';

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
  {
    messages,
    system,
  }: {
    messages?: Array<CoreMessage>;
    system?: string;
  },
  other?: Parameters<BotContext['reply']>[1],
) {
  const ctx = injectBotContext();
  const env = injectEnv();

  const messageIds = await addToChatHistory({
    messages,
  });

  const allMessages = await retrieveChatHistory(messageIds);

  const tools = {
    getCryptoRate,
    addToMemory: addToMemoryToolFactory(),
    getFromMemory: getFromMemoryToolFactory(),
    generateImage: generateImageFactory(),
    textToSpeech: ttsFactory(),
    setLanguage: setChatLanguageFactory(),
    ...moderateContentFactory(),
    ...reminderToolFactory(),
    ...getCurrentPlanToolFactory(),
    ...weatherToolFactory(),
    ...searchToolsFactory(),
  };

  const chat: CoreMessage[] = [
    {
      role: 'system',
      content:
        system ||
        `${ctx.session.plan === 'free' ? `Always add text in the start about upgrade to paid plan. Answer as short as you can. Plan descriptions: ${getPlansDescription(env)}\n` : ''}${env.ASSISTANT_PROMPT}

Current time: ${new Date().toISOString()}.
Current plan: ${ctx.session.plan}
Current chat: ${ctx.chat?.title ?? 'Unknown'}
Current chat language: ${ctx.session.language ?? 'Unknown'}
`,
    },
    ...excludeToolResultIfItFirst(allMessages),
  ];

  const result = await __generateText<typeof tools>({
    model: injectOpenaiProvider()(env.OPENAI_MODEL, {
      structuredOutputs: true,
    }),
    temperature: env.TEMPERATURE,
    messages: chat,
    maxSteps: ctx.session.plan === 'free' ? 1 : env.MAX_STEPS,
    experimental_continueSteps: true,
    tools: ctx.session.plan === 'free' ? ({} as typeof tools) : tools,
    experimental_telemetry: {
      isEnabled: true,
    },
    maxTokens: env.MAX_TOKENS,
  });

  await addToChatHistory({
    messages: result.response.messages,
  });

  const paymentKeyboard =
    ctx.session.plan === 'free' ? await createKeyboardWithPaymentLinks() : undefined;

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

async function addToChatHistory({ messages }: { messages?: Array<CoreMessage> }) {
  const ctx = injectBotContext();
  const redis = injectRedisClient();
  const env = injectEnv();

  if (!messages || messages.length === 0) {
    return [];
  }

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
    pipeline.expire(id, env.MAX_HISTORY_MESSAGE_TTL);
  }

  const [, , messageIds] = await pipeline.exec<[unknown, unknown, string[]]>();

  return messageIds;
}

async function retrieveChatHistory(messageIds?: string[]) {
  const redis = injectRedisClient();

  if (!messageIds || messageIds.length === 0) {
    return [];
  }

  const messages = await redis.mget<CoreMessage[]>(messageIds);

  return messages.filter((msg) => !!msg);
}
