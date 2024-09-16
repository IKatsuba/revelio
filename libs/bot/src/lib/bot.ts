import { Bot, Context, session } from 'grammy';

import { env } from '@revelio/env/server';

import { groupComposer } from './composers/group';
import { privateComposer } from './composers/private';
import { BotContext } from './context';
import { getInitialSessionData, getSessionKey, sessionStorage } from './session';

export const bot = new Bot<BotContext>(env.BOT_TOKEN);

bot.use(
  session({
    storage: sessionStorage,
    getSessionKey: (ctx) => getSessionKey(ctx.chatId),
    initial: () => getInitialSessionData(),
  }),
);

bot.filter(Context.has.chatType('private')).use(privateComposer);

bot.filter(Context.has.chatType(['group', 'supergroup'])).use(groupComposer);
