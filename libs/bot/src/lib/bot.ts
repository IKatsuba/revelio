import { Bot, Context, session } from 'grammy';

import {
  BotContext,
  getInitialSessionData,
  getSessionKey,
  sessionStorage,
} from '@revelio/bot-utils';
import { env } from '@revelio/env/server';

import { groupComposer } from './composers/group';
import { privateComposer } from './composers/private';

export async function initBot(): Promise<Bot<BotContext>> {
  const bot = new Bot<BotContext>(env.BOT_TOKEN);

  bot.use(
    session({
      storage: sessionStorage,
      getSessionKey: (ctx) => getSessionKey(ctx.chatId),
      initial: () => getInitialSessionData(),
    }),
  );

  bot.filter(Context.has.chatType('private'), privateComposer);

  bot.filter(Context.has.chatType(['group', 'supergroup']), groupComposer);

  await bot.init();

  return bot;
}
