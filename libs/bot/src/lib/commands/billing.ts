import { InlineKeyboard } from 'grammy';

import { BotContext, plansDescription, telegramify } from '@revelio/bot-utils';
import { generateAnswer } from '@revelio/llm/server';
import { prisma } from '@revelio/prisma/server';
import { stripe } from '@revelio/stripe/server';

const howYouPay = `Choose a subscription plan that suits your needs:

${plansDescription}`;

export async function billing(ctx: BotContext) {
  await ctx.replyWithChatAction('typing');

  if (!ctx.chatId) {
    await ctx.reply('Failed to create a customer. Please try again later.');
    return;
  }

  const customer =
    (await prisma.customer.findUnique({
      where: {
        id: ctx.chatId.toString(),
      },
    })) ??
    (await stripe.customers
      .create({
        name:
          ctx.chat?.title ?? ctx.chat?.username ?? `${ctx.chat?.first_name} ${ctx.chat?.last_name}`,
      })
      .then((customer) =>
        prisma.customer.create({
          data: {
            id: ctx.chatId!.toString(),
            stripeCustomerId: customer.id,
          },
        }),
      ));

  if (!customer) {
    await ctx.reply('An error occurred while creating the customer. Please try again later.');
    return;
  }

  if (ctx.session.plan && ctx.session.plan !== 'free') {
    const session = await stripe.billingPortal.sessions.create({
      customer: customer?.stripeCustomerId,
      return_url: 'https://t.me/RevelioGPTBot',
    });

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

  const prices = await prisma.price.findMany({
    where: {
      active: true,
      lookupKey: {
        not: 'free',
      },
    },
    select: {
      id: true,
      currency: true,
      lookupKey: true,
      unitAmount: true,
      product: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      unitAmount: 'asc',
    },
  });

  const sessions = await Promise.all(
    prices.map(async (price) => {
      const session = await stripe.checkout.sessions.create({
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
        name: price.product.name,
        url: session.url!,
      };
    }),
  );

  if (sessions.find((session) => !session.url)) {
    await ctx.reply('An error occurred while creating the session. Please try again later.');
    return;
  }

  const keyboard = new InlineKeyboard().text('Free', 'subscription:free');

  for (const session of sessions) {
    keyboard.url(session.name, session.url);
  }

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
  await ctx.reply('You have successfully subscribed to the free plan.');
}
