import { Customer } from '@prisma/client';
import { InlineKeyboard } from 'grammy';
import { Context } from 'hono';
import Stripe from 'stripe';

import { BotContext } from '@revelio/bot-utils';
import { getEnv } from '@revelio/env';

export function createStripe(c: Context) {
  const env = getEnv(c);

  return new Stripe(env.STRIPE_SECRET_KEY);
}

export async function getCustomer(ctx: BotContext) {
  return (
    await ctx.sql`
      SELECT "id", "stripeCustomerId"
      FROM "Customer"
      WHERE "id" = ${ctx.chatId!.toString()}
    `
  )?.[0] as Customer;
}

export async function createCustomer(ctx: BotContext) {
  const customer = await ctx.stripe.customers.create({
    name: ctx.chat?.title ?? ctx.chat?.username ?? `${ctx.chat?.first_name} ${ctx.chat?.last_name}`,
  });

  return (
    await ctx.sql`
      INSERT INTO "Customer" ("id", "stripeCustomerId")
      VALUES (${ctx.chatId!.toString()}, ${customer.id})
      RETURNING "id", "stripeCustomerId";
    `
  )?.[0] as Customer;
}

export async function createKeyboardWithPaymentLinks(customer: Customer, ctx: BotContext) {
  const prices = await ctx.sql`
    SELECT "Price"."id", "currency", "lookupKey", "unitAmount", "productId", "Product"."name" as "productName"
    FROM "Price"
           JOIN "Product" ON "productId" = "Product"."id"
    WHERE "Price"."active" = TRUE
      AND "lookupKey" != 'free'
    ORDER BY "unitAmount" ASC;
  `;

  console.log('[billing] create sessions');

  const sessions = await Promise.all(
    prices.map(async (price) => {
      const session = await ctx.stripe.checkout.sessions.create({
        after_expiration: {
          recovery: {
            enabled: true,
          },
        },
        customer: customer.stripeCustomerId,
        success_url: 'https://t.me/RevelioGPTBot',
        cancel_url: 'https://t.me/RevelioGPTBot',
        mode: 'subscription',
        line_items: [
          {
            price: price.id,
            quantity: 1,
          },
        ],
        allow_promotion_codes: true,
        expand: ['line_items.data.price.product'],
      });

      return {
        id: price.id,
        name: price.productName,
        url: session.url!,
      };
    }),
  );

  if (sessions.find((session) => !session.url)) {
    throw new Error('[billing] No session url');
  }

  const keyboard = new InlineKeyboard().text('Free', 'subscription:free');

  for (const session of sessions) {
    keyboard.url(session.name, session.url);
  }

  return keyboard;
}
