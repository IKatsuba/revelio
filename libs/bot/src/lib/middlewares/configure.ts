import { Middleware } from 'grammy';

import { BotContext, provideBotContext } from '@revelio/bot-utils';

export function configureBot(): Middleware<BotContext> {
  return async (ctx, next) => {
    provideBotContext(ctx);

    await next();
  };
}
