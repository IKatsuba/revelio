import { Bot, Context, session } from 'grammy';

import {
  BotContext,
  getInitialSessionData,
  getSessionKey,
  sessionStorage,
} from '@revelio/bot-utils';
import { env } from '@revelio/env/server';

import { groupWebhookComposer } from './composers/group-webhook-composer';
import { privateWebhookComposer } from './composers/private-webhook-composer';

export async function initWebhookBot(): Promise<Bot<BotContext>> {
  const bot = new Bot<BotContext>(env.BOT_TOKEN);

  bot.use(
    session({
      storage: sessionStorage,
      getSessionKey: (ctx) => getSessionKey(ctx.chatId),
      initial: () => getInitialSessionData(),
    }),
  );

  bot.filter(Context.has.chatType('private'), privateWebhookComposer);

  bot.filter(Context.has.chatType(['group', 'supergroup']), groupWebhookComposer);

  await bot.init();

  return bot;
}
