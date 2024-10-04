import { task } from '@trigger.dev/sdk/v3';
import { convertToCoreMessages } from 'ai';

import { getSession, sendLongText, setSession } from '@revelio/bot-utils';
import { env } from '@revelio/env/server';
import { generateText } from '@revelio/llm/server';
import { addTokenUsage } from '@revelio/stripe/server';

export const promptTask = task({
  id: 'image',
  async run(payload: { chatId: number; prompt: string }) {
    const session = await getSession(payload.chatId);

    const messages = [
      ...session.messages,
      ...convertToCoreMessages([
        {
          role: 'user',
          content: payload.prompt ?? '',
        },
      ]),
    ];

    const result = await generateText(messages);

    session.messages = [...messages, ...result.responseMessages].slice(-env.MAX_HISTORY_SIZE);

    await setSession(payload.chatId, session);

    if (!result.text) {
      console.log('No text generated');
      return;
    }

    await sendLongText(payload.chatId, result.text);

    await addTokenUsage(payload.chatId, {
      model: 'gpt-4o-mini',
      mode: 'output',
      tokenCount: result.usage.completionTokens,
    });

    await addTokenUsage(payload.chatId, {
      model: 'gpt-4o-mini',
      mode: 'input',
      tokenCount: result.usage.promptTokens,
    });
  },
});

export type PromptTask = typeof promptTask;
