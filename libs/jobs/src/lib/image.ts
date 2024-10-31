import { task } from '@trigger.dev/sdk/v3';

import { api } from '@revelio/bot-utils';
import { generateImage } from '@revelio/llm/server';

export const imageTask = task({
  id: 'image',
  async run(payload: { chatId: number; prompt: string }) {
    const url = await generateImage(payload.prompt);

    if (!url) {
      await api.sendMessage(payload.chatId, 'Failed to generate image');
      return;
    }

    await api.sendChatAction(payload.chatId, 'upload_photo');

    await api.sendPhoto(payload.chatId, url);
  },
});

export type ImageTask = typeof imageTask;
