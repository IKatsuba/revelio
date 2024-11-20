import { Client } from '@upstash/qstash';
import { Composer } from 'grammy';

import { BotContext, getPlansDescription } from '@revelio/bot-utils';
import { createToolMessages, generateAnswer } from '@revelio/llm';

function createClient(ctx: BotContext) {
  return new Client({
    token: ctx.env.QSTASH_TOKEN,
    baseUrl: ctx.env.QSTASH_URL,
    retry: {
      retries: 3,
      backoff: (retry_count) => Math.exp(retry_count) * 50,
    },
  });
}

export const billingComposer = new Composer<BotContext>();

billingComposer.on('pre_checkout_query', async (ctx) => {
  const hasActivePlan = ctx.session.plan && ctx.session.plan !== 'free';

  await ctx.answerPreCheckoutQuery(!hasActivePlan);

  if (hasActivePlan) {
    await ctx.replyWithChatAction('typing');

    await generateAnswer(ctx, {
      messages: [
        ...createToolMessages({
          toolName: 'subscribeToNewPlan',
          result: {
            error: 'You already have an active subscription. Cancel it first.',
          },
        }),
      ],
    });
  }
});

billingComposer.on('message:successful_payment', async (ctx) => {
  await ctx.replyWithChatAction('typing');

  const successfulPayment = ctx.message.successful_payment;

  if (!successfulPayment) {
    ctx.logger.error('No successful_payment in message');
    return;
  }

  const plan = successfulPayment.invoice_payload as 'basic' | 'premium' | 'free';

  if (!(await ctx.prisma.user.findFirst({ where: { id: ctx.from.id.toString() } }))) {
    const chatMember = await ctx.getChatMember(ctx.from.id);

    await ctx.prisma.user.create({
      data: {
        id: ctx.from.id.toString(),
        username: ctx.from.username,
      },
    });

    await ctx.prisma.groupMember.create({
      data: {
        userId: ctx.from.id.toString(),
        groupId: ctx.chat.id.toString(),
        role: chatMember.status,
      },
    });
  }

  await ctx.prisma.payment.create({
    data: {
      totalAmount: successfulPayment.total_amount,
      currency: successfulPayment.currency,
      telegramPaymentChargeId: successfulPayment.telegram_payment_charge_id,
      invoicePayload: plan,
      subscriptionExpirationDate: new Date(successfulPayment.subscription_expiration_date! * 1000),
      isFirstRecurring: successfulPayment.is_first_recurring ?? false,
      ownerId: ctx.from.id.toString(),
      groupId: ctx.chat.id.toString(),
    },
  });

  await ctx.prisma.group.update({
    where: {
      id: ctx.chat.id.toString(),
    },
    data: {
      plan,
      telegramPaymentChargeId: successfulPayment.telegram_payment_charge_id,
    },
  });

  ctx.session.plan = plan;

  await generateAnswer(ctx, {
    messages: [
      ...createToolMessages({
        toolName: 'updateBillingPlan',
        result: {
          plansDescription: getPlansDescription(ctx.env),
          result: `User ${ctx.from.username} has successfully subscribed to the ${plan} plan.`,
        },
      }),
    ],
  });

  await createClient(ctx).publishJSON({
    url: ctx.env.CHECK_PLAN_CALLBACK_URL,
    headers: {
      'Content-Type': 'application/json',
    },
    body: {
      update: ctx.update,
    },
    notBefore: successfulPayment.subscription_expiration_date! + 60 * 60,
  });
});
