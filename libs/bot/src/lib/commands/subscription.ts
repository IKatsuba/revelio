import { InlineKeyboard } from 'grammy';

import { prisma } from '@revelio/prisma/server';
import { stripe } from '@revelio/stripe/server';

import { BotContext } from '../context';

export async function subscription(ctx: BotContext) {
  console.log(`New message received from user ${ctx.from?.username} (id: ${ctx.from?.id})`);
  await ctx.replyWithChatAction('typing');

  const customer =
    (await prisma.customer.findUnique({
      where: {
        id: ctx.chatId,
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
            id: ctx.chatId!,
            stripeCustomerId: customer.id,
          },
        }),
      ));

  if (!customer) {
    await ctx.reply('An error occurred while creating the customer. Please try again later.');
    return;
  }

  if (ctx.session.plan) {
    const session = await stripe.billingPortal.sessions.create({
      customer: customer?.stripeCustomerId,
      return_url: 'https://t.me/RevelioDevBot',
    });

    await ctx.reply(`You have already subscribed to the ${ctx.session.plan} plan.`, {
      reply_markup: new InlineKeyboard().url('Manage subscription', session.url),
    });

    return;
  }

  const prices = await prisma.price.findMany({
    where: {
      active: true,
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

  const session = await stripe.checkout.sessions.create({
    customer: customer.stripeCustomerId,
    success_url: 'https://t.me/RevelioDevBot',
    cancel_url: 'https://t.me/RevelioDevBot',
    mode: 'subscription',
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    subscription_data: {
      metadata: {},
    },
    line_items: prices.map((price) => ({
      price: price.id,
      quantity: 1,
    })),
    allow_promotion_codes: true,
    expand: ['line_items.data.price.product'],
  });

  if (!session.url) {
    await ctx.reply('An error occurred while creating the session. Please try again later.');
    return;
  }

  const keyboard = new InlineKeyboard().url(`Pay as you go`, session.url).row();

  await ctx.reply('Please choose a plan:', {
    reply_markup: keyboard,
  });
}
