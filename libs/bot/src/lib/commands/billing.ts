import { InlineKeyboard } from 'grammy';

import { BotContext, plansDescription } from '@revelio/bot-utils';
import { createToolMessages, generateAnswer } from '@revelio/llm';
import { createCustomer, getCustomer } from '@revelio/stripe';

// const howYouPay = `Choose a subscription plan that suits your needs:
//
// ${plansDescription}`;

export async function billing(ctx: BotContext) {
  console.log('[billing] start');
  await ctx.replyWithChatAction('typing');

  if (!ctx.chatId) {
    console.log('[billing] No chatId');
    await ctx.reply('Failed to create a customer. Please try again later.');
    return;
  }

  console.log('[billing] find customer');

  const customer = (await getCustomer(ctx)) ?? (await createCustomer(ctx));

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
          ...createToolMessages({
            toolName: 'getCurrentPlan',
            result: {
              plan: ctx.session.plan,
              plansDescription,
            },
          }),
        ],
      },
      {
        reply_markup: new InlineKeyboard().url('Manage your plan', session.url),
      },
    );

    return;
  }

  console.log('[billing] reply');

  await generateAnswer(ctx, {
    messages: [
      {
        role: 'user',
        content: '/plans',
      },
      ...createToolMessages({
        toolName: 'getPlans',
        result: {
          plansDescription,
        },
      }),
    ],
  });
}

export async function callbackQuerySubscriptionFree(ctx: BotContext) {
  ctx.session.plan = 'free';
  console.log('[callbackQuerySubscriptionFree] plan:free');
  await ctx.reply('You have successfully subscribed to the free plan.');
}
