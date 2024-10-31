import { Update } from '@grammyjs/types';
import { task } from '@trigger.dev/sdk/v3';

import { initTaskBot } from './bot/bot';

export const promptTask = task({
  id: 'prompt',
  async run(payload: Update) {
    const bot = await initTaskBot();

    await bot.handleUpdate(payload);
  },
});

export type PromptTask = typeof promptTask;
