import { Middleware } from 'grammy';

import { BotContext, provideBotContext } from './context';

export function configureBot(): Middleware<BotContext> {
  return async (ctx, next) => {
    provideBotContext(ctx);

    await next();
  };
}
