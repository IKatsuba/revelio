import { task } from '@trigger.dev/sdk/v3';
import { convertToCoreMessages } from 'ai';
import { parseBlob } from 'music-metadata';

import { bot, getSession, sendLongText } from '@revelio/bot-utils';
import { env } from '@revelio/env/server';
import { generateText, transcribe } from '@revelio/llm/server';
import { addAudioUsage, addTokenUsage } from '@revelio/stripe/server';

export const transcribeTask = task({
  id: 'transcribe',
  async run(payload: { fileId: string; chatId: number }) {
    console.log('Transcribing audio');

    const fileData = await bot.api.getFile(payload.fileId);

    const fileResponse = await fetch(
      `https://api.telegram.org/file/bot${env.BOT_TOKEN}/${fileData.file_path}`,
    );

    const blob = await fileResponse.clone().blob();

    const metadata = await parseBlob(blob, { duration: true });

    if (!metadata.format.duration) {
      await bot.api.sendMessage(payload.chatId, 'Failed to transcribe audio');
      return;
    }

    const text = await transcribe(fileResponse);

    await addAudioUsage(payload.chatId, {
      model: 'whisper-1',
      minuteCount: Math.ceil(metadata.format.duration / 60),
    });

    const session = await getSession(payload.chatId);

    session.messages.push(
      ...convertToCoreMessages([
        {
          role: 'user',
          content: text,
        },
      ]),
    );

    await bot.api.sendChatAction(payload.chatId, 'typing');

    const response = await generateText(session.messages);

    session.messages = [...session.messages, ...response.responseMessages].slice(
      -env.MAX_HISTORY_SIZE,
    );

    await sendLongText(payload.chatId, response.text);

    await addTokenUsage(payload.chatId, {
      model: 'gpt-4o-mini',
      mode: 'output',
      tokenCount: response.usage.completionTokens,
    });

    await addTokenUsage(payload.chatId, {
      model: 'gpt-4o-mini',
      mode: 'input',
      tokenCount: response.usage.promptTokens,
    });
  },
});

export type TranscribeTask = typeof transcribeTask;
