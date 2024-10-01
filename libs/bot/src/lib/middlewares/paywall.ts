import { track } from '@vercel/analytics/server';
import { NextFunction } from 'grammy';

import { BotContext } from '@revelio/bot-utils';

import { billing } from '../commands/billing';

export async function paywall(ctx: BotContext, next: NextFunction) {
  if (!ctx.session.plan) {
    await ctx.reply('You need to add a payment method to use this feature');

    await billing(ctx);
    await track('paywall', {
      fromUser: ctx.from?.username ?? 'unknown',
      chatId: ctx.chat?.id ?? 0,
    });
    return;
  }

  await next();
}
