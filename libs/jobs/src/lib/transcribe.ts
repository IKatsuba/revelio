import { task } from '@trigger.dev/sdk/v3';
import { convertToCoreMessages } from 'ai';
import { parseBlob } from 'music-metadata';

import { api, getSession, sendLongText } from '@revelio/bot-utils';
import { env } from '@revelio/env/server';
import { generateTextFactory, transcribe } from '@revelio/llm/server';

export const transcribeTask = task({
  id: 'transcribe',
  async run(payload: { fileId: string; chatId: number; messageId: number; userId: number }) {
    console.log('Transcribing audio');

    const fileData = await api.getFile(payload.fileId);

    const fileResponse = await fetch(
      `https://api.telegram.org/file/bot${env.BOT_TOKEN}/${fileData.file_path}`,
    );

    const blob = await fileResponse.clone().blob();

    const metadata = await parseBlob(blob, { duration: true });

    if (!metadata.format.duration) {
      await api.sendMessage(payload.chatId, 'Failed to transcribe audio');
      return;
    }

    const text = await transcribe(fileResponse);

    const session = await getSession(payload.chatId);

    session.messages.push(
      ...convertToCoreMessages([
        {
          role: 'user',
          content: text,
        },
      ]),
    );

    await api.sendChatAction(payload.chatId, 'typing');

    const generateText = generateTextFactory({
      chatId: payload.chatId,
      messageId: payload.messageId,
      userId: payload.userId,
      plan: session.plan,
    });

    const response = await generateText(session.messages);

    session.messages = [...session.messages, ...response.responseMessages].slice(
      -env.MAX_HISTORY_SIZE,
    );

    await sendLongText(payload.chatId, response.text);
  },
});

export type TranscribeTask = typeof transcribeTask;
