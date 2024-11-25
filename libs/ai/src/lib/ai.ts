import { HumanMessage, trimMessages } from '@langchain/core/messages';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { ChatOpenAI } from '@langchain/openai';

import { createKeyboardWithPaymentLinks } from '@revelio/billing';
import {
  BotContext,
  getPlansDescription,
  injectBotContext,
  sendLongText,
} from '@revelio/bot-utils';
import { injectEnv } from '@revelio/env';

import { injectMessageHistory } from './history';
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

export async function promptMessage({
  replyOptions,
}: {
  replyOptions?: Parameters<BotContext['reply']>[1];
} = {}) {
  const env = injectEnv();
  const ctx = injectBotContext();

  const chatHistory = injectMessageHistory();

  const prompt = ChatPromptTemplate.fromMessages([
    [
      'system',
      `${ctx.session.plan === 'free' ? `Always add text in the start about upgrade to paid plan. Answer as short as you can. Plan descriptions: ${getPlansDescription(env)}\n` : ''}${env.ASSISTANT_PROMPT}

Current time: ${new Date().toISOString()}.
Current plan: ${ctx.session.plan}
Current chat: ${ctx.chat?.title ?? 'Unknown'}
Current chat language: ${ctx.session.language ?? 'Unknown'}
`,
    ],
    new MessagesPlaceholder('history'),
    new MessagesPlaceholder('question'),
  ]);

  const llm = new ChatOpenAI(
    {
      model: 'gpt-4o-mini',
    },
    {
      baseURL: env.OPENAI_API_URL,
      apiKey: env.OPENAI_API_KEY,
    },
  );

  const agent = createReactAgent({
    llm,
    tools: [
      generateImageFactory(),
      getCryptoRate,
      getCurrentPlanToolFactory(),
      addToMemoryToolFactory(),
      getFromMemoryToolFactory(),
      moderateContentFactory(),
      ...reminderToolFactory(),
      ...searchToolsFactory(),
      setChatLanguageFactory(),
      ttsFactory(),
      weatherToolFactory(),
    ],
  });

  const chain = prompt
    .pipe(async ({ messages, ...other }) => ({
      messages: await trimMessages(messages, {
        maxTokens: 20000,
        strategy: 'last',
        tokenCounter: llm,
        includeSystem: true,
      }),
      ...other,
    }))
    .pipe(({ messages, ...other }) => {
      if (!messages.length) {
        return {
          messages,
          ...other,
        };
      }

      if (messages.at(0).getType() === 'tool') {
        return {
          messages: messages.slice(1),
          ...other,
        };
      }

      if (messages.at(0).getType() === 'system' && messages.at(1).getType() === 'tool') {
        messages.splice(1, 1);
      }

      return {
        messages,
        ...other,
      };
    })
    .pipe(agent)
    .pipe(async ({ messages }) => {
      await chatHistory.addMessages(messages.slice(1));
      return { messages };
    })
    .pipe(({ messages }) => messages.at(-1))
    .pipe(new StringOutputParser());

  const aiAnswer = await chain.invoke(
    {
      history: await chatHistory.getMessages(),
      question:
        typeof ctx.prompt === 'string'
          ? new HumanMessage(
              ctx.photoUrl
                ? {
                    content: [
                      {
                        type: 'text',
                        text: ctx.prompt,
                      },
                      {
                        type: 'image_url',
                        image_url: {
                          url: ctx.photoUrl,
                        },
                      },
                    ],
                  }
                : ctx.prompt,
            )
          : ctx.prompt,
    },
    {
      configurable: { sessionId: ctx.chatId.toString() },
    },
  );

  const paymentKeyboard =
    ctx.session.plan === 'free' ? await createKeyboardWithPaymentLinks() : undefined;

  await sendLongText(ctx, aiAnswer, {
    reply_markup: paymentKeyboard,
    ...(replyOptions ?? {}),
  });
}
