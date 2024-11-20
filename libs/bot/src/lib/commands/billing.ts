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
        reply_markup: new InlineKeyboard().url('Manage your plan', ''),
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
