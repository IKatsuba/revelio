import { InlineKeyboard } from 'grammy';

import { BotContext, getPlansDescription } from '@revelio/bot-utils';
import { injectEnv } from '@revelio/env';
import { createToolMessages, generateAnswer } from '@revelio/llm';
import { injectLogger } from '@revelio/logger';
import { injectPrisma } from '@revelio/prisma';

export async function billing(ctx: BotContext) {
  const logger = injectLogger();
  const env = injectEnv();

  logger.info('[billing] start');
  await ctx.replyWithChatAction('typing');

  if (!ctx.chatId) {
    logger.error('[billing] No chatId');
    await ctx.reply('Failed to create a customer. Please try again later.');
    return;
  }

  if (ctx.session.plan && ctx.session.plan !== 'free') {
    logger.info('[billing] Already subscribed');

    await generateAnswer(
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
              plansDescription: getPlansDescription(env),
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

  logger.info('[billing] reply');

  await generateAnswer({
    messages: [
      {
        role: 'user',
        content: '/plans',
      },
      ...createToolMessages({
        toolName: 'getPlans',
        result: {
          plansDescription: getPlansDescription(env),
        },
      }),
    ],
  });
}

export async function callbackQuerySubscriptionFree(ctx: BotContext) {
  const logger = injectLogger();

  ctx.session.plan = 'free';
  logger.info('[callbackQuerySubscriptionFree] plan:free');
  await ctx.reply('You have successfully subscribed to the free plan.');
}

export async function callbackQuerySubscriptionCancel(ctx: BotContext) {
  const logger = injectLogger();
  const prisma = injectPrisma();

  logger.info('[callbackQuerySubscriptionCancel] plan:cancel');

  const group = await prisma.group.findFirst({
    where: {
      id: ctx.chatId!.toString(),
    },
  });

  if (!group) {
    logger.error('[callbackQuerySubscriptionCancel] No group');
    await ctx.reply('Failed to cancel subscription. Please try again later.');
    return;
  }

  ctx.session.plan = group.plan as 'free' | 'basic' | 'premium';

  if (!group.plan) {
    logger.error(
      '[callbackQuerySubscriptionCancel] No plan, but user trying to cancel subscription',
      {
        groupId: group.id,
      },
    );

    await generateAnswer({
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

  const lastPayment = await prisma.payment.findFirst({
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
    logger.error('[callbackQuerySubscriptionCancel] No last payment, but group has a plan', {
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

  await prisma.group.update({
    where: {
      id: group.id,
    },
    data: {
      plan: 'free',
      telegramPaymentChargeId: null,
    },
  });

  ctx.session.plan = 'free';

  await generateAnswer({
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
