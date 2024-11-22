import { HumanMessage, SystemMessage, trimMessages } from '@langchain/core/messages';
import { RunnableWithMessageHistory } from '@langchain/core/runnables';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { ChatOpenAI } from '@langchain/openai';

import { getPlansDescription, injectBotContext } from '@revelio/bot-utils';
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

export async function promptMessage() {
  const env = injectEnv();
  const ctx = injectBotContext();

  const chatHistory = injectMessageHistory();

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
    messageModifier: new SystemMessage(
      `${ctx.session.plan === 'free' ? `Always add text in the start about upgrade to paid plan. Answer as short as you can. Plan descriptions: ${getPlansDescription(env)}\n` : ''}${env.ASSISTANT_PROMPT}

Current time: ${new Date().toISOString()}.
Current plan: ${ctx.session.plan}
Current chat: ${ctx.chat?.title ?? 'Unknown'}
Current chat language: ${ctx.session.language ?? 'Unknown'}
`,
    ),
  });

  const trimmer = trimMessages({
    maxTokens: 20000,
    strategy: 'last',
    tokenCounter: llm,
    includeSystem: true,
  });

  const chain = trimmer.pipe((messages) => ({ messages })).pipe(agent);

  const chainWithHistory = new RunnableWithMessageHistory({
    runnable: chain,
    getMessageHistory: () => chatHistory,
  });

  const res = await chainWithHistory.invoke([new HumanMessage(ctx.message.text)], {
    configurable: { sessionId: ctx.chatId.toString() },
  });

  return res.messages.at(-1).content;
}
