import { InlineKeyboard } from 'grammy';

import { BotContext } from '@revelio/bot-utils';

export async function createKeyboardWithPaymentLinks(ctx: BotContext) {
  ctx.logger.info('[billing] create sessions');

  const links = await Promise.all(
    ['Basic', 'Premium'].map(async (name) => {
      return [
        name,
        await ctx.api.createInvoiceLink(
          name,
          `Buy ${name} subscription`,
          name.toLowerCase(),
          undefined as any,
          'XTR',
          [
            {
              label: name,
              amount: name === 'Basic' ? ctx.env.BASIC_PLAN_PRICE : ctx.env.PREMIUM_PLAN_PRICE,
            },
          ],
          {
            subscription_period: 2592000,
          },
        ),
      ];
    }),
  );

  const keyboard = new InlineKeyboard().text('Free', 'subscription:free');

  for (const [name, url] of links) {
    keyboard.url(
      `${name} — ⭐️${name === 'Basic' ? ctx.env.BASIC_PLAN_PRICE : ctx.env.PREMIUM_PLAN_PRICE}`,
      url,
    );
  }

  return keyboard;
}
