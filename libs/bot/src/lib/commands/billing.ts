import { InlineKeyboard } from 'grammy';

import { BotContext, plansDescription } from '@revelio/bot-utils';
import { createToolMessages, generateAnswer } from '@revelio/llm';
import { createCustomer, getCustomer } from '@revelio/stripe';

// const howYouPay = `Choose a subscription plan that suits your needs:
//
// ${plansDescription}`;

export async function billing(ctx: BotContext) {
  ctx.logger.info('[billing] start');
  await ctx.replyWithChatAction('typing');

  if (!ctx.chatId) {
    ctx.logger.error('[billing] No chatId');
    await ctx.reply('Failed to create a customer. Please try again later.');
    return;
  }

  ctx.logger.info('[billing] find customer');

  const customer =
    (await getCustomer(ctx.c, ctx.chatId.toString())) ??
    (await createCustomer(
      ctx.c,
      ctx.chatId.toString(),
      ctx.chat?.title ?? ctx.chat?.username ?? `${ctx.chat?.first_name} ${ctx.chat?.last_name}`,
    ));

  if (!customer) {
    ctx.logger.error('[billing] No customer');
    await ctx.reply('An error occurred while creating the customer. Please try again later.');
    return;
  }

  if (ctx.session.plan && ctx.session.plan !== 'free') {
    ctx.logger.info('[billing] Already subscribed');
    const session = await ctx.stripe.billingPortal.sessions.create({
      customer: customer?.stripeCustomerId,
      return_url: 'https://t.me/RevelioGPTBot',
    });

    ctx.logger.info('[billing] session was created');

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

  ctx.logger.info('[billing] reply');

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
  ctx.logger.info('[callbackQuerySubscriptionFree] plan:free');
  await ctx.reply('You have successfully subscribed to the free plan.');
}
