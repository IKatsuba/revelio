import { NextFunction } from 'grammy';

import { BotContext } from '@revelio/bot-utils';
import { injectLogger } from '@revelio/logger';

import { billing } from '../commands/billing';

export async function paywall(ctx: BotContext, next: NextFunction) {
  if (!ctx.session.plan) {
    await ctx.reply('You need an active subscription to use this feature');

    await billing(ctx);
    injectLogger().info('paywall', {
      fromUser: ctx.from?.username ?? 'unknown',
      chatId: ctx.chat?.id ?? 0,
    });
    return;
  }

  await next();
}
