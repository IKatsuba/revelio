import { Bot, Context } from 'grammy';

import { BotContext, sessionMiddleware } from '@revelio/bot-utils';
import { injectEnv } from '@revelio/env';
import { injectLogger } from '@revelio/logger';

import { billingComposer } from './composers/billing-composer';
import { groupWebhookComposer } from './composers/group-webhook-composer';
import { privateWebhookComposer } from './composers/private-webhook-composer';
import { configureBot } from './middlewares/configure';

export async function initWebhookBot(): Promise<Bot<BotContext>> {
  const env = injectEnv();
  const logger = injectLogger();
  const bot = new Bot<BotContext>(env.BOT_TOKEN, {
    client: {
      apiRoot: env.TELEGRAM_API_URL,
    },
    botInfo:
      env.NODE_ENV === 'production'
        ? {
            id: 7409250764,
            is_bot: true,
            first_name: 'RevelioGPT',
            username: 'RevelioGPTBot',
            can_join_groups: true,
            can_read_all_group_messages: false,
            supports_inline_queries: false,
            can_connect_to_business: false,
            has_main_web_app: false,
          }
        : {
            id: 7293411907,
            is_bot: true,
            first_name: 'RevelioDev',
            username: 'RevelioDevBot',
            can_join_groups: true,
            can_read_all_group_messages: false,
            supports_inline_queries: false,
            can_connect_to_business: false,
            has_main_web_app: false,
          },
  });

  bot.use(configureBot());
  bot.use(sessionMiddleware());

  bot.use(billingComposer);

  bot.filter(Context.has.chatType('private'), privateWebhookComposer);
  bot.filter(Context.has.chatType(['group', 'supergroup']), groupWebhookComposer);

  logger.info('bot.init');
  await bot.init();

  return bot;
}
