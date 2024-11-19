import { Customer } from '@prisma/client';
import { InlineKeyboard } from 'grammy';
import { Context } from 'hono';
import Stripe from 'stripe';

import { BotContext } from '@revelio/bot-utils';
import { getEnv } from '@revelio/env';
import { createSQLClient } from '@revelio/prisma';

export function createStripe(c: Context) {
  const env = getEnv(c);

  return new Stripe(env.STRIPE_SECRET_KEY);
}

export async function getCustomer(c: Context, chatId: string) {
  const sql = createSQLClient(c);

  return (
    await sql`
      SELECT "id", "stripeCustomerId"
      FROM "Customer"
      WHERE "id" = ${chatId}
    `
  )?.[0] as Customer;
}

export async function createCustomer(c: Context, chatId: string, name: string) {
  const stripe = createStripe(c);
  const sql = createSQLClient(c);

  const customer = await stripe.customers.create({ name });

  return (
    await sql`
      INSERT INTO "Customer" ("id", "stripeCustomerId")
      VALUES (${chatId}, ${customer.id})
      RETURNING "id", "stripeCustomerId";
    `
  )?.[0] as Customer;
}

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
          [{ label: name, amount: name === 'Basic' ? 400 : 800 }],
          {
            subscription_period: 2592000,
          },
        ),
      ];
    }),
  );

  const keyboard = new InlineKeyboard().text('Free', 'subscription:free');

  for (const [name, url] of links) {
    keyboard.url(`${name} — ⭐️${name === 'Basic' ? 400 : 800}`, url);
  }

  return keyboard;
}
