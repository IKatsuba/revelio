import { Bot, Context, session } from 'grammy';

import {
  BotContext,
  getInitialSessionData,
  getSessionKey,
  sessionStorage,
} from '@revelio/bot-utils';
import { env } from '@revelio/env/server';

import { groupTaskComposer } from './composers/group-task-composer';
import { privateTaskComposer } from './composers/private-task-composer';

export async function initTaskBot() {
  const bot = new Bot<BotContext>(env.BOT_TOKEN);

  bot.use(
    session({
      storage: sessionStorage,
      getSessionKey: (ctx) => getSessionKey(ctx.chatId),
      initial: () => getInitialSessionData(),
    }),
  );

  bot.filter(Context.has.chatType('private'), privateTaskComposer);

  bot.filter(Context.has.chatType(['group', 'supergroup']), groupTaskComposer);

  await bot.init();

  return bot;
}
