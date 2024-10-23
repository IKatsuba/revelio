import { task } from '@trigger.dev/sdk/v3';
import { convertToCoreMessages } from 'ai';

import { getSession, sendLongText, setSession } from '@revelio/bot-utils';
import { env } from '@revelio/env/server';
import { generateTextFactory } from '@revelio/llm/server';
import { addTokenUsage } from '@revelio/stripe/server';

export const promptTask = task({
  id: 'prompt',
  async run(payload: { chatId: number; prompt: string; messageId: number; userId: number }) {
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

    const generateText = generateTextFactory({
      chatId: payload.chatId,
      messageId: payload.messageId,
      userId: payload.userId,
    });

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
      tokenCount: result.steps.reduce((sum, step) => sum + step.usage.completionTokens, 0),
    });

    await addTokenUsage(payload.chatId, {
      model: 'gpt-4o-mini',
      mode: 'input',
      tokenCount: result.steps.reduce((sum, step) => sum + step.usage.promptTokens, 0),
    });
  },
});

export type PromptTask = typeof promptTask;
