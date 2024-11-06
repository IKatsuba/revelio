import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { NextRequest } from 'next/server';

import { Update } from '@grammyjs/types';
import { ReminderStatus } from '@prisma/client';
import { Bot } from 'grammy';
import { nanoid } from 'nanoid';

import { BotContext, sessionMiddleware } from '@revelio/bot-utils';
import { env } from '@revelio/env/server';
import { generateAnswer } from '@revelio/llm/server';
import { prisma } from '@revelio/prisma/server';

export const POST = verifySignatureAppRouter(async (req: NextRequest) => {
  try {
    const { id, update, text } = (await req.json()) as {
      id: string;
      update: Update;
      text: string;
    };

    await prisma.reminder.update({
      where: {
        id,
      },
      data: {
        status: ReminderStatus.SENT,
      },
    });

    const bot = new Bot<BotContext>(env.BOT_TOKEN, {
      client: {
        apiRoot: env.TELEGRAM_API_URL,
      },
    });
    bot.use(sessionMiddleware);

    bot.on('message', async (ctx) => {
      await ctx.replyWithChatAction('typing');

      const toolCallId = `tool_${nanoid()}`;

      await generateAnswer(
        ctx,
        {
          messages: [
            {
              role: 'assistant',
              content: [
                {
                  type: 'tool-call',
                  toolCallId,
                  toolName: 'sendReminder',
                  args: {},
                },
              ],
            },
            {
              role: 'tool',
              content: [
                {
                  type: 'tool-result',
                  toolCallId,
                  toolName: 'sendReminder',
                  result: {
                    reminderText: text,
                    originalMessage: update,
                  },
                },
              ],
            },
          ],
        },
        {
          reply_parameters: {
            message_id: ctx.message.message_id,
          },
        },
      );
    });

    await bot.init();

    await bot.handleUpdate(update);
  } catch (error) {
    console.error(error);
  }

  return Response.json({ status: 'ok' });
});
