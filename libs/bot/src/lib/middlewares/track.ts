import { Middleware } from 'grammy';

import { injectAnalytics } from '@revelio/analytics';
import { BotContext } from '@revelio/bot-utils';

export function track(name: string): Middleware<BotContext> {
  return async (ctx, next) => {
    injectAnalytics().track(name);

    await next();
  };
}
