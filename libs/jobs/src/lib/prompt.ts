import { task } from '@trigger.dev/sdk/v3';
import { convertToCoreMessages, CoreMessage } from 'ai';

import { getSession, sendLongText, setSession } from '@revelio/bot-utils';
import { env } from '@revelio/env/server';
import { generateTextFactory } from '@revelio/llm/server';

export const promptTask = task({
  id: 'prompt',
  async run(payload: { chatId: number; prompt: string; messageId: number; userId: number }) {
    const session = await getSession(payload.chatId);

    const messages = excludeToolCallMessages([
      ...session.messages,
      ...convertToCoreMessages([
        {
          role: 'user',
          content: payload.prompt ?? '',
        },
      ]),
    ]).slice(-env.MAX_HISTORY_SIZE);

    const generateText = generateTextFactory({
      chatId: payload.chatId,
      messageId: payload.messageId,
      userId: payload.userId,
      plan: session.plan,
    });

    const result = await generateText(messages);

    session.messages = excludeToolCallMessages([...messages, ...result.response.messages]).slice(
      -env.MAX_HISTORY_SIZE,
    );

    await setSession(payload.chatId, session);

    if (!result.text) {
      console.log('No text generated');
      return;
    }

    await sendLongText(payload.chatId, result.text);
  },
});

export type PromptTask = typeof promptTask;

function excludeToolCallMessages(messages: CoreMessage[]) {
  return messages.filter((message) => {
    if (typeof message.content === 'string') {
      return true;
    }

    if (message.role !== 'assistant' && message.role !== 'tool') {
      return true;
    }

    return !message.content.find(
      (content) => content.type === 'tool-call' || content.type === 'tool-result',
    );
  });
}
