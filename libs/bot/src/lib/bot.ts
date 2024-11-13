import { Bot, Context } from 'grammy';
import { Context as HonoContext } from 'hono';

import { BotContext, sessionMiddleware } from '@revelio/bot-utils';
import { getEnv } from '@revelio/env';

import { groupWebhookComposer } from './composers/group-webhook-composer';
import { privateWebhookComposer } from './composers/private-webhook-composer';
import { configureBot } from './middlewares/configure';

export async function initWebhookBot(c: HonoContext): Promise<Bot<BotContext>> {
  console.log('initWebhookBot');

  const env = getEnv(c);
  const bot = new Bot<BotContext>(env.BOT_TOKEN, {
    client: {
      apiRoot: env.TELEGRAM_API_URL,
    },
  });

  bot.use(configureBot(c));
  bot.use(sessionMiddleware(c));

  bot.filter(Context.has.chatType('private'), privateWebhookComposer);

  bot.filter(Context.has.chatType(['group', 'supergroup']), groupWebhookComposer);

  console.log('bot.init');
  await bot.init();

  return bot;
}
