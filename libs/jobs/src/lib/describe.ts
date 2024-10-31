import { Update } from '@grammyjs/types';
import { task } from '@trigger.dev/sdk/v3';

import { initTaskBot } from './bot/bot';

export const describeTask = task({
  id: 'describe',
  async run(payload: Update) {
    const bot = await initTaskBot();

    await bot.handleUpdate(payload);
  },
});

export type DescribeTask = typeof describeTask;
