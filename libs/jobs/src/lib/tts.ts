import { task } from '@trigger.dev/sdk/v3';
import { InputFile } from 'grammy';

import { bot } from '@revelio/bot-utils';
import { env } from '@revelio/env/server';
import { textToSpeech } from '@revelio/llm/server';
import { addSpeechUsage } from '@revelio/stripe/server';

export const ttsTask = task({
  id: 'tts',
  async run(payload: { prompt: string; chatId: number }) {
    const audioBuffer = await textToSpeech(payload.prompt);

    if (!audioBuffer) {
      await bot.api.sendMessage(payload.chatId, 'Failed to generate speech');
      return;
    }

    await bot.api.sendChatAction(payload.chatId, 'upload_voice');

    await bot.api.sendVoice(payload.chatId, new InputFile(audioBuffer));

    await addSpeechUsage(payload.chatId, {
      model: env.TTS_MODEL,
      characterCount: payload.prompt.split(/\s+/).length,
    });
  },
});

export type TtsTask = typeof ttsTask;
