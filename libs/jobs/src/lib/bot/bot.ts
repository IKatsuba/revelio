import { logger } from '@trigger.dev/sdk/v3';
import { Bot, Context } from 'grammy';

import { BotContext, sessionMiddleware } from '@revelio/bot-utils';
import { env } from '@revelio/env/server';

import { groupTaskComposer } from './composers/group-task-composer';
import { privateTaskComposer } from './composers/private-task-composer';

export async function initTaskBot({ signal }: { signal: AbortSignal }) {
  logger.log('Configuring bot');

  const bot = new Bot<BotContext>(env.BOT_TOKEN, {
    client: {
      apiRoot: env.TELEGRAM_API_URL,
    },
  });

  bot.use(sessionMiddleware);

  bot.filter(Context.has.chatType('private'), privateTaskComposer);

  bot.filter(Context.has.chatType(['group', 'supergroup']), groupTaskComposer);

  logger.log('Bot configured');

  logger.log('Initializing bot');

  await bot.init(signal as any);

  logger.log('Bot initialized');

  return bot;
}
