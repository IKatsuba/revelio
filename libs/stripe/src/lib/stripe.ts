import { Customer } from '@prisma/client';
import { InlineKeyboard } from 'grammy';
import { Context } from 'hono';
import { nanoid } from 'nanoid';
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
  const prices = await ctx.sql`
    SELECT "Price"."id", "currency", "lookupKey", "unitAmount", "productId", "Product"."name" as "productName"
    FROM "Price"
           JOIN "Product" ON "productId" = "Product"."id"
    WHERE "Price"."active" = TRUE
      AND "lookupKey" != 'free'
    ORDER BY "unitAmount" ASC;
  `;

  ctx.logger.info('[billing] create sessions');

  const sessions = prices.map((price) => {
    const token = nanoid(20);

    const requestUrl = new URL(ctx.c.req.url);
    requestUrl.pathname = `/b/${token}`;

    return {
      name: price.productName,
      url: requestUrl.toString(),
      key: `bs:${token}`,
      payload: {
        chatId: ctx.chatId!.toString(),
        chatName:
          ctx.chat?.title ?? ctx.chat?.username ?? `${ctx.chat?.first_name} ${ctx.chat?.last_name}`,
        price: {
          id: price.id,
          productName: price.productName,
        },
      },
    };
  });

  const pipeline = ctx.redis.pipeline();

  for (const session of sessions) {
    pipeline.set(session.key, session.payload, {
      ex: 60 * 60,
    });
  }

  await pipeline.exec();

  const keyboard = new InlineKeyboard().text('Free', 'subscription:free');

  for (const session of sessions) {
    keyboard.url(session.name, session.url);
  }

  return keyboard;
}
