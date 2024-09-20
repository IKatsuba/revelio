import { InlineKeyboard } from 'grammy';

import { prisma } from '@revelio/prisma/server';
import { stripe } from '@revelio/stripe/server';

import { BotContext } from '../context';
import { telegramify } from '../telegramify';

export async function billing(ctx: BotContext) {
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

    await ctx.reply(
      `You have already added your payment method. But you can always manage it here:`,
      {
        reply_markup: new InlineKeyboard().url('Manage subscription', session.url),
      },
    );

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
    })),
    allow_promotion_codes: true,
    expand: ['line_items.data.price.product'],
  });

  if (!session.url) {
    await ctx.reply('An error occurred while creating the session. Please try again later.');
    return;
  }

  const keyboard = new InlineKeyboard().url('Add payment method', session.url);

  await ctx.reply(
    telegramify(`
You pay only for what you use. No upfront costs. No termination fees. No hidden charges. No surprises.

How you pay:

- **OpenAI gpt-4o-mini Input Tokens**
  - flat fee US$0.60 for the first 2,000,000 tokens in a month
  - Next 2,000,001-5,000,000 used: US$0.0000000028 per tokens
  - Next 5,000,001-12,000,000 used: US$0.0000000026 per tokens
  - Next 12,000,001-30,000,000 used: US$0.0000000024 per tokens
  - 30,000,001+ used: US$0.0000000022 per tokens

- **OpenAI gpt-4o-mini Output Tokens**
  - flat fee US$1.20 for the first 1,000,000 tokens in a month
  - Next 1,000,001-2,500,000 used: US$0.0000000112 per tokens
  - Next 2,500,001-6,000,000 used: US$0.0000000104 per tokens
  - Next 6,000,001-15,000,000 used: US$0.0000000096 per tokens
  - 15,000,001+ used: US$0.0000000088 per tokens

- **OpenAI dall-e-2 1024x1024 Images**
  - US$0.0004 per image for the first 30 images in a month
  - Next 31-70 used: US$0.00037 per image
  - Next 71-160 used: US$0.00034 per image
  - Next 161-400 used: US$0.00031 per image
  - 401+ used: US$0.00028 per image

- **OpenAI whisper-1 Audio**
  - US$0.00012 per minute for the first 100 minutes in a month
  - Next 101-250 used: US$0.000112 per minute
  - Next 251-600 used: US$0.000104 per minute
  - Next 601-1,500 used: US$0.000096 per minute
  - 1,501+ used: US$0.000088 per minute

- **OpenAI tts-1 Speech**
  - US$0.00003 per character for the first 10,000 characters in a month
  - Next 10,001-25,000 used: US$0.000028 per character
  - Next 25,001-60,000 used: US$0.000026 per character
  - Next 60,001-150,000 used: US$0.000024 per character
  - 150,001+ used: US$0.000022 per character
    `),
    {
      reply_markup: keyboard,
      parse_mode: 'MarkdownV2',
    },
  );
}
