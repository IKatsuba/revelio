import { CloudflareD1MessageHistory } from '@langchain/cloudflare';
import { HumanMessage, trimMessages } from '@langchain/core/messages';
import { RunnableWithMessageHistory } from '@langchain/core/runnables';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { ChatOpenAI } from '@langchain/openai';

import { injectBotContext } from '@revelio/bot-utils';
import { injectEnv } from '@revelio/env';

import { injectMessageHistory } from './history';

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
    tools: [],
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
