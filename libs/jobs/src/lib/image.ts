import { task } from '@trigger.dev/sdk/v3';

import { bot } from '@revelio/bot-utils';
import { env } from '@revelio/env/server';
import { generateImage } from '@revelio/llm/server';
import { addImageUsage } from '@revelio/stripe/server';

export const imageTask = task({
  id: 'image',
  async run(payload: { chatId: number; prompt: string }) {
    const url = await generateImage(payload.prompt);

    if (!url) {
      await bot.api.sendMessage(payload.chatId, 'Failed to generate image');
      return;
    }

    await bot.api.sendChatAction(payload.chatId, 'upload_photo');

    await bot.api.sendPhoto(payload.chatId, url);

    await addImageUsage(payload.chatId, {
      model: env.IMAGE_MODEL,
      resolution: env.IMAGE_SIZE,
    });
  },
});

export type ImageTask = typeof imageTask;
