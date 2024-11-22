import { Update } from '@grammyjs/types';
import { trace } from '@opentelemetry/api';
import { Bot } from 'grammy';
import { Context } from 'hono';

import { BotContext, sessionMiddleware } from '@revelio/bot-utils';
import { injectEnv } from '@revelio/env';
import { createToolMessages, generateAnswer } from '@revelio/llm';
import { injectLogger } from '@revelio/logger';
import { injectPrisma } from '@revelio/prisma';

export async function remindersAfterNotify(c: Context) {
  const env = injectEnv();
  const prisma = injectPrisma();
  const logger = injectLogger();
  try {
    const { id, update, text } = (await c.req.json()) as {
      id: string;
      update: Update;
      text: string;
    };

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
    bot.use(sessionMiddleware());

    bot.on('message', async (ctx) => {
      await ctx.replyWithChatAction('typing');

      await generateAnswer(
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
