import { CloudflareD1MessageHistory } from '@langchain/cloudflare';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { ChatOpenAI } from '@langchain/openai';
import { BufferMemory } from 'langchain/memory';

import { injectBotContext } from '@revelio/bot-utils';
import { injectEnv } from '@revelio/env';

export async function promptMessage() {
  const env = injectEnv();
  const ctx = injectBotContext();

  const model = new ChatOpenAI({
    apiKey: env.OPENAI_API_KEY,
    model: 'gpt-4o-mini',
    temperature: 0,
  });

  const memory = new BufferMemory({
    returnMessages: true,
    chatHistory: new CloudflareD1MessageHistory({
      sessionId: ctx.chatId.toString(),
      database: env.revelioMessagesDB,
    }),
  });

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', 'You are a helpful chatbot'],
    new MessagesPlaceholder('history'),
    ['human', '{input}'],
  ]);

  const chain = RunnableSequence.from([
    {
      input: (initialInput) => initialInput.input,
      memory: () => memory.loadMemoryVariables({}),
    },
    {
      input: (previousOutput) => previousOutput.input,
      history: (previousOutput) => previousOutput.memory.history,
    },
    prompt,
    model,
    new StringOutputParser(),
  ]);

  const chainInput = { input: ctx.message.text };

  const res = await chain.invoke(chainInput);

  await memory.saveContext(chainInput, {
    output: res,
  });

  return res;
}
