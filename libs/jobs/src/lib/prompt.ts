import { task } from '@trigger.dev/sdk/v3';
import { convertToCoreMessages } from 'ai';

import { getSession, sendLongText, setSession } from '@revelio/bot-utils';
import { env } from '@revelio/env/server';
import { generateTextFactory } from '@revelio/llm/server';

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
    ].slice(-env.MAX_HISTORY_SIZE);

    const generateText = generateTextFactory({
      chatId: payload.chatId,
      messageId: payload.messageId,
      userId: payload.userId,
      plan: session.plan,
    });

    const result = await generateText(messages);

    session.messages = [...messages, ...result.response.messages].slice(-env.MAX_HISTORY_SIZE);

    console.log(result.response.messages);

    await setSession(payload.chatId, session);

    if (!result.text) {
      console.log('No text generated');
      return;
    }

    await sendLongText(payload.chatId, result.text);
  },
});

export type PromptTask = typeof promptTask;
