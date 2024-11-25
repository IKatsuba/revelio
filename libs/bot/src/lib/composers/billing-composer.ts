import { Client } from '@upstash/qstash';
import { Composer } from 'grammy';

import { promptMessage } from '@revelio/ai';
import { BotContext, getPlansDescription } from '@revelio/bot-utils';
import { injectEnv } from '@revelio/env';
import { createToolMessages } from '@revelio/llm';
import { injectLogger } from '@revelio/logger';
import { injectPrisma } from '@revelio/prisma';

function createClient() {
  const env = injectEnv();

  return new Client({
    token: env.QSTASH_TOKEN,
    baseUrl: env.QSTASH_URL,
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

    ctx.prompt = createToolMessages({
      toolName: 'subscribeToNewPlan',
      result: {
        error: 'You already have an active subscription. Cancel it first.',
      },
    });

    await promptMessage();
  }
});

billingComposer.on('message:successful_payment', async (ctx) => {
  const prisma = injectPrisma();
  const logger = injectLogger();
  const env = injectEnv();

  await ctx.replyWithChatAction('typing');

  const successfulPayment = ctx.message.successful_payment;

  if (!successfulPayment) {
    logger.error('No successful_payment in message');
    return;
  }

  const plan = successfulPayment.invoice_payload as 'basic' | 'premium' | 'free';

  if (!(await prisma.user.findFirst({ where: { id: ctx.from.id.toString() } }))) {
    const chatMember = await ctx.getChatMember(ctx.from.id);

    await prisma.user.create({
      data: {
        id: ctx.from.id.toString(),
        username: ctx.from.username,
      },
    });

    await prisma.groupMember.create({
      data: {
        userId: ctx.from.id.toString(),
        groupId: ctx.chat.id.toString(),
        role: chatMember.status,
      },
    });
  }

  await prisma.payment.create({
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

  await prisma.group.update({
    where: {
      id: ctx.chat.id.toString(),
    },
    data: {
      plan,
      telegramPaymentChargeId: successfulPayment.telegram_payment_charge_id,
    },
  });

  ctx.session.plan = plan;

  ctx.prompt = createToolMessages({
    toolName: 'updateBillingPlan',
    result: {
      plansDescription: getPlansDescription(env),
      result: `User ${ctx.from.username} has successfully subscribed to the ${plan} plan.`,
    },
  });

  await promptMessage();

  await createClient().publishJSON({
    url: env.CHECK_PLAN_CALLBACK_URL,
    headers: {
      'Content-Type': 'application/json',
    },
    body: {
      update: ctx.update,
    },
    notBefore: successfulPayment.subscription_expiration_date! + 60 * 60,
  });
});
