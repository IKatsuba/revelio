import { Bot, Context, session } from 'grammy';

import {
  BotContext,
  getInitialSessionData,
  getSessionKey,
  sessionStorage,
} from '@revelio/bot-utils';

import { groupComposer } from './composers/group';
import { privateComposer } from './composers/private';
import { requestMiddleware } from './middlewares/request';

export function initBot({ bot, request }: { bot: Bot<BotContext>; request: Request }) {
  bot.use(
    session({
      storage: sessionStorage,
      getSessionKey: (ctx) => getSessionKey(ctx.chatId),
      initial: () => getInitialSessionData(),
    }),
  );

  bot.use(requestMiddleware(request));

  bot.filter(Context.has.chatType('private'), privateComposer);

  bot.filter(Context.has.chatType(['group', 'supergroup']), groupComposer);
}
