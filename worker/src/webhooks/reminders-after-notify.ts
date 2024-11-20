import { Update } from '@grammyjs/types';
import { trace } from '@opentelemetry/api';
import { Receiver } from '@upstash/qstash';
import { Bot } from 'grammy';
import { Context, MiddlewareHandler } from 'hono';

import { BotContext, sessionMiddleware } from '@revelio/bot-utils';
import { getEnv } from '@revelio/env';
import { createToolMessages, generateAnswer } from '@revelio/llm';
import { createLogger } from '@revelio/logger';
import { createPrisma } from '@revelio/prisma';

function createReceiver(c: Context) {
  const env = getEnv(c);

  return new Receiver({
    currentSigningKey: env.QSTASH_CURRENT_SIGNING_KEY,
    nextSigningKey: env.QSTASH_NEXT_SIGNING_KEY,
  });
}

export function qstashVerify(): MiddlewareHandler {
  return async (c, next) => {
    const signature = c.req.header('Upstash-Signature');

    if (!signature) {
      return c.text('Unauthorized', 401);
    }

    const body = await c.req.raw.clone().text();
    const isVerified = await createReceiver(c).verify({
      body,
      signature,
    });

    if (!isVerified) {
      return c.text('Unauthorized', 401);
    }

    await next();
  };
}

export async function remindersAfterNotify(c: Context) {
  const env = getEnv(c);
  const prisma = createPrisma(c);
  const logger = createLogger(c);
  try {
    const { id, update, text } = (await c.req.json()) as {
      id: string;
      update: Update;
      text: string;
    };

    // await sql`
    //   UPDATE "Reminder"
    //   SET "status"    = ${ReminderStatus.SENT},
    //       "updatedAt" = NOW()
    //   WHERE "id" = ${id}
    // `;

    await prisma.reminder.update({
      where: {
        id,
      },
      data: {
        status: 'sent',
      },
    });

    const bot = new Bot<BotContext>(env.BOT_TOKEN, {
      client: {
        apiRoot: env.TELEGRAM_API_URL,
      },
    });
    bot.use(sessionMiddleware(c));

    bot.on('message', async (ctx) => {
      await ctx.replyWithChatAction('typing');

      await generateAnswer(
        ctx,
        {
          messages: [
            ...createToolMessages({
              toolName: 'sendReminder',
              result: {
                reminderText: text,
                originalMessage: update,
              },
            }),
          ],
        },
        {
          reply_parameters: {
            message_id: ctx.message.message_id,
          },
          parse_mode: 'MarkdownV2',
        },
      );
    });

    await bot.init();

    await bot.handleUpdate(update);
  } catch (error) {
    logger.error('Failed to send reminder', { error });
    trace.getActiveSpan()?.recordException(error as any);
  }

  return Response.json({ status: 'ok' });
}
