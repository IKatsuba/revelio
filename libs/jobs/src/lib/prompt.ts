import { Update } from '@grammyjs/types';
import { logger, task } from '@trigger.dev/sdk/v3';

import { initTaskBot } from './bot/bot';

export const promptTask = task({
  id: 'prompt',
  async run(payload: Update, { signal }) {
    const bot = await logger.trace('init-bot', () => initTaskBot({ signal }));

    await logger.trace('handle-update', () => bot.handleUpdate(payload));
  },
});

export type PromptTask = typeof promptTask;
