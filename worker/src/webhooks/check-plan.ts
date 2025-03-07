import { Update } from '@grammyjs/types';
import { trace } from '@opentelemetry/api';
import { Bot } from 'grammy';
import { createFactory } from 'hono/factory';

import { runAgentAndReply } from '@revelio/agent';
import { BotContext, configureBot, sessionMiddleware } from '@revelio/bot-utils';
import { injectEnv } from '@revelio/env';
import { createToolMessages } from '@revelio/llm';
import { injectLogger } from '@revelio/logger';
import { injectPrisma } from '@revelio/prisma';

import { qstashVerify } from '../middlewares/qstash-verify';

const factory = createFactory();

export const checkPlanHandlers = factory.createHandlers(qstashVerify(), async (c) => {
  const env = injectEnv();
  const logger = injectLogger();
  const prisma = injectPrisma();

  try {
    const { update } = (await c.req.json()) as {
      update: Update;
    };

    const bot = new Bot<BotContext>(env.BOT_TOKEN, {
      client: {
        apiRoot: env.TELEGRAM_API_URL,
      },
    });
    bot.use(configureBot());
    bot.use(sessionMiddleware());

    bot.on('message:successful_payment', async (ctx) => {
      await ctx.replyWithChatAction('typing');

      const futurePayment = await prisma.payment.findFirst({
        where: {
          groupId: ctx.chat.id.toString(),
          telegramPaymentChargeId: ctx.message.successful_payment.telegram_payment_charge_id,
          subscriptionExpirationDate: {
            gt: new Date(),
          },
        },
      });

      if (!futurePayment) {
        await prisma.group.update({
          where: {
            id: ctx.chat.id.toString(),
          },
          data: {
            plan: 'free',
            telegramPaymentChargeId: null,
          },
        });

        ctx.session.plan = 'free';

        ctx.prompt = createToolMessages({
          toolName: 'checkPayment',
          result: {
            error:
              'Future payment not found. Please check your subscription. Now you on free plan.',
          },
        });

        await runAgentAndReply();

        return;
      }
    });

    await bot.init();

    await bot.handleUpdate(update);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    const stack = error instanceof Error ? error.stack : undefined;

    logger.error('Failed to handle check plan webhook', {
      error: msg,
      stack,
    });
    trace.getActiveSpan()?.recordException(error as any);
  }

  return Response.json({ status: 'ok' });
});
