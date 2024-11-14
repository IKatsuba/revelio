import { Middleware } from 'grammy';

import { BotContext } from '@revelio/bot-utils';

export function track(name: string): Middleware<BotContext> {
  return async (ctx, next) => {
    ctx.analytics.track(name);

    await next();
  };
}
