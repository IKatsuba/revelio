import { task } from '@trigger.dev/sdk/v3';
import { InputFile } from 'grammy';

import { api } from '@revelio/bot-utils';
import { textToSpeech } from '@revelio/llm/server';

export const ttsTask = task({
  id: 'tts',
  async run(payload: { prompt: string; chatId: number }) {
    const audioBuffer = await textToSpeech(payload.prompt);

    if (!audioBuffer) {
      await api.sendMessage(payload.chatId, 'Failed to generate speech');
      return;
    }

    // payload.prompt.split(/\s+/).length

    await api.sendChatAction(payload.chatId, 'upload_voice');

    await api.sendVoice(payload.chatId, new InputFile(audioBuffer));
  },
});

export type TtsTask = typeof ttsTask;
