import { Bot, Context } from 'grammy';

import { BotContext, sessionMiddleware } from '@revelio/bot-utils';
import { env } from '@revelio/env';

import { groupTaskComposer } from './composers/group-task-composer';
import { privateTaskComposer } from './composers/private-task-composer';

export async function initTaskBot() {
  const bot = new Bot<BotContext>(env.BOT_TOKEN, {
    client: {
      apiRoot: env.TELEGRAM_API_URL,
    },
  });

  bot.use(sessionMiddleware);

  bot.filter(Context.has.chatType('private'), privateTaskComposer);

  bot.filter(Context.has.chatType(['group', 'supergroup']), groupTaskComposer);

  await bot.init();

  return bot;
}
