import { InlineKeyboard } from 'grammy';

import { BotContext, plansDescription } from '@revelio/bot-utils';
import { createToolMessages, generateAnswer } from '@revelio/llm';

export async function billing(ctx: BotContext) {
  ctx.logger.info('[billing] start');
  await ctx.replyWithChatAction('typing');

  if (!ctx.chatId) {
    ctx.logger.error('[billing] No chatId');
    await ctx.reply('Failed to create a customer. Please try again later.');
    return;
  }

  if (ctx.session.plan && ctx.session.plan !== 'free') {
    ctx.logger.info('[billing] Already subscribed');

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
        reply_markup: new InlineKeyboard().text('Cancel subscription', 'subscription:cancel'),
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

export async function callbackQuerySubscriptionCancel(ctx: BotContext) {
  ctx.logger.info('[callbackQuerySubscriptionCancel] plan:cancel');

  const group = await ctx.prisma.group.findFirst({
    where: {
      id: ctx.chatId!.toString(),
    },
  });

  if (!group) {
    ctx.logger.error('[callbackQuerySubscriptionCancel] No group');
    await ctx.reply('Failed to cancel subscription. Please try again later.');
    return;
  }

  ctx.session.plan = group.plan as 'free' | 'basic' | 'premium';

  if (!group.plan) {
    ctx.logger.error(
      '[callbackQuerySubscriptionCancel] No plan, but user trying to cancel subscription',
      {
        groupId: group.id,
      },
    );

    await generateAnswer(ctx, {
      messages: [
        {
          role: 'user',
          content: '/cancel_subscription',
        },
        ...createToolMessages({
          toolName: 'cancelSubscription',
          result: {
            error: 'Did not find any active subscription',
          },
        }),
      ],
    });
    return;
  }

  const lastPayment = await ctx.prisma.payment.findFirst({
    where: {
      groupId: group.id,
      subscriptionExpirationDate: {
        gt: new Date(),
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!lastPayment) {
    ctx.logger.error('[callbackQuerySubscriptionCancel] No last payment, but group has a plan', {
      groupId: group.id,
      groupPlan: group.plan,
    });

    await ctx.reply('Failed to cancel subscription. Please try again later');
    return;
  }

  await ctx.api.editUserStarSubscription(
    parseInt(lastPayment.ownerId, 10),
    lastPayment.telegramPaymentChargeId,
    true,
  );

  await ctx.prisma.group.update({
    where: {
      id: group.id,
    },
    data: {
      plan: 'free',
      telegramPaymentChargeId: null,
    },
  });

  ctx.session.plan = 'free';

  await generateAnswer(ctx, {
    messages: [
      {
        role: 'user',
        content: '/cancel_subscription',
      },
      ...createToolMessages({
        toolName: 'cancelSubscription',
        result: {
          result: 'Subscription canceled',
        },
      }),
    ],
  });
}
