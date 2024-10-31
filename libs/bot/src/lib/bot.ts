import { Bot, Context } from 'grammy';

import { BotContext, sessionMiddleware } from '@revelio/bot-utils';
import { env } from '@revelio/env/server';

import { groupWebhookComposer } from './composers/group-webhook-composer';
import { privateWebhookComposer } from './composers/private-webhook-composer';

export async function initWebhookBot(): Promise<Bot<BotContext>> {
  const bot = new Bot<BotContext>(env.BOT_TOKEN);

  bot.use(sessionMiddleware);

  bot.filter(Context.has.chatType('private'), privateWebhookComposer);

  bot.filter(Context.has.chatType(['group', 'supergroup']), groupWebhookComposer);

  await bot.init();

  return bot;
}
