import { Middleware } from 'grammy';

import { BotContext } from '@revelio/bot-utils';

export function requestMiddleware(req: Request): Middleware<BotContext> {
  return async (ctx, next) => {
    ctx.request = req;
    await next();
  };
}
