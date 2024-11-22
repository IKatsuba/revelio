import { Middleware } from 'grammy';

import { Analytics } from '@revelio/analytics';
import { BotContext } from '@revelio/bot-utils';
import { inject } from '@revelio/di';

export function track(name: string): Middleware<BotContext> {
  return async (ctx, next) => {
    inject(Analytics).track(name);

    await next();
  };
}
