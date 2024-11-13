import { InlineKeyboard } from 'grammy';

import { BotContext, plansDescription, telegramify } from '@revelio/bot-utils';
import { generateAnswer } from '@revelio/llm';

const howYouPay = `Choose a subscription plan that suits your needs:

${plansDescription}`;

export async function billing(ctx: BotContext) {
  console.log('[billing] start');
  await ctx.replyWithChatAction('typing');

  if (!ctx.chatId) {
    console.log('[billing] No chatId');
    await ctx.reply('Failed to create a customer. Please try again later.');
    return;
  }

  console.log('[billing] find customer');

  const customer =
    (
      await ctx.sql`
    SELECT "id", "stripeCustomerId"
    FROM "Customer"
    WHERE "id" = ${ctx.chatId!.toString()}
  `
    )?.[0] ??
    (await ctx.stripe.customers
      .create({
        name:
          ctx.chat?.title ?? ctx.chat?.username ?? `${ctx.chat?.first_name} ${ctx.chat?.last_name}`,
      })
      .then(
        async (customer) =>
          (
            await ctx.sql`
          INSERT INTO "Customer" ("id", "stripeCustomerId")
          VALUES (${ctx.chatId!.toString()}, ${customer.id})
          RETURNING "id", "stripeCustomerId";
        `
          )?.[0],
      ));

  if (!customer) {
    console.log('[billing] No customer');
    await ctx.reply('An error occurred while creating the customer. Please try again later.');
    return;
  }

  if (ctx.session.plan && ctx.session.plan !== 'free') {
    console.log('[billing] Already subscribed');
    const session = await ctx.stripe.billingPortal.sessions.create({
      customer: customer?.stripeCustomerId,
      return_url: 'https://t.me/RevelioGPTBot',
    });

    console.log('[billing] session was created');

    await generateAnswer(
      ctx,
      {
        messages: [
          {
            role: 'user',
            content: '/billing',
          },
        ],
      },
      {
        reply_markup: new InlineKeyboard().url('Manage your plan', session.url),
      },
    );

    return;
  }

  console.log('[billing] find prices');

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
    console.log('[billing] No session url');
    await ctx.reply('An error occurred while creating the session. Please try again later.');
    return;
  }

  const keyboard = new InlineKeyboard().text('Free', 'subscription:free');

  for (const session of sessions) {
    keyboard.url(session.name, session.url);
  }

  console.log('[billing] reply');
  await ctx.reply(
    telegramify(`
${howYouPay}
    `),
    {
      reply_markup: keyboard,
      parse_mode: 'MarkdownV2',
    },
  );
}

export async function callbackQuerySubscriptionFree(ctx: BotContext) {
  ctx.session.plan = 'free';
  console.log('[callbackQuerySubscriptionFree] plan:free');
  await ctx.reply('You have successfully subscribed to the free plan.');
}
