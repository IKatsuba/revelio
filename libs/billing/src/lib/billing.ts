import { InlineKeyboard } from 'grammy';

import { injectBotContext } from '@revelio/bot-utils';
import { injectEnv } from '@revelio/env';
import { injectLogger } from '@revelio/logger';

export async function createKeyboardWithPaymentLinks() {
  const logger = injectLogger();
  const env = injectEnv();
  const ctx = injectBotContext();

  logger.info('[billing] create sessions');

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
              amount: name === 'Basic' ? env.BASIC_PLAN_PRICE : env.PREMIUM_PLAN_PRICE,
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
      `${name} — ⭐️${name === 'Basic' ? env.BASIC_PLAN_PRICE : env.PREMIUM_PLAN_PRICE}`,
      url,
    );
  }

  return keyboard;
}
