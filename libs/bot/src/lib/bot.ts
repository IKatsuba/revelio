import { Bot, Context, session } from 'grammy';

import {
  BotContext,
  getInitialSessionData,
  getSessionKey,
  sessionStorage,
} from '@revelio/bot-utils';

import { groupComposer } from './composers/group';
import { privateComposer } from './composers/private';

export function initBot(bot: Bot<BotContext>) {
  bot.use(
    session({
      storage: sessionStorage,
      getSessionKey: (ctx) => getSessionKey(ctx.chatId),
      initial: () => getInitialSessionData(),
    }),
  );

  bot.filter(Context.has.chatType('private')).use(privateComposer);

  bot.filter(Context.has.chatType(['group', 'supergroup'])).use(groupComposer);
}
