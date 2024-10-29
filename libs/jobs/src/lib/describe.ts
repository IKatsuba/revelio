import { task } from '@trigger.dev/sdk/v3';

import { bot, getSession, sendLongText } from '@revelio/bot-utils';
import { env } from '@revelio/env/server';
import { generateTextFactory } from '@revelio/llm/server';

export const describeTask = task({
  id: 'describe',
  async run(payload: {
    chatId: number;
    caption?: string;
    fileId: string;
    messageId: number;
    userId: number;
  }) {
    const fileData = await bot.api.getFile(payload.fileId);

    const session = await getSession(payload.chatId);

    const messages = [
      ...session.messages,
      {
        role: 'user' as const,
        content: [
          { type: 'text' as const, text: payload.caption ?? 'What’s in this image?' },
          {
            type: 'image' as const,
            image: new URL(
              `https://api.telegram.org/file/bot${env.BOT_TOKEN}/${fileData.file_path}`,
            ),
          },
        ],
      },
    ].slice(-env.MAX_HISTORY_SIZE);

    const generateText = generateTextFactory({
      chatId: payload.chatId,
      messageId: payload.messageId,
      userId: payload.userId,
      plan: session.plan,
    });

    const response = await generateText(messages);

    session.messages = [...messages, ...response.response.messages].slice(-env.MAX_HISTORY_SIZE);

    await sendLongText(payload.chatId, response.text);
  },
});

export type DescribeTask = typeof describeTask;
