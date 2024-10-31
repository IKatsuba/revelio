import { Update } from '@grammyjs/types';
import { task } from '@trigger.dev/sdk/v3';

import { initTaskBot } from './bot/bot';

export const transcribeTask = task({
  id: 'transcribe',
  async run(payload: Update) {
    const bot = await initTaskBot();

    await bot.handleUpdate(payload);
  },
});

export type TranscribeTask = typeof transcribeTask;
