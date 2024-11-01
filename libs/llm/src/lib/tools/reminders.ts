import { ReminderStatus } from '@prisma/client';
import { Client } from '@upstash/qstash';
import { tool } from 'ai';
import { parseDate } from 'chrono-node';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { BotContext, telegramify } from '@revelio/bot-utils';
import { env } from '@revelio/env/server';
import { prisma } from '@revelio/prisma/server';

const client = new Client({
  token: env.QSTASH_TOKEN,
  baseUrl: env.QSTASH_URL,
  retry: {
    retries: 6,
    backoff: (retry_count) => Math.exp(retry_count) * 50,
  },
});

export function reminderToolFactory(ctx: BotContext) {
  return {
    createReminder: tool({
      description: 'create a reminder then notify the user.',
      parameters: z.object({
        message: z.string().describe('a reminder message to the user in markdown'),
        time: z
          .string()
          .describe(
            'a natural language date like "tomorrow at 3pm", Today, Tomorrow, Yesterday, Last Friday, 17 August 2013 - 19 August 2013, This Friday from 13:00 - 16.00, 5 days ago, 2 weeks from now, next year, etc.',
          ),
        timezone: z.string().describe('the timezone to use for the reminder'),
      }),
      execute: async ({ message, time, timezone }) => {
        if (!ctx.chatId) {
          return {
            status: 'error',
            message: 'No chatId found',
          };
        }

        if (!ctx.from?.id) {
          return {
            status: 'error',
            message: 'No userId found',
          };
        }

        console.log('Creating reminder:', message, time, timezone);

        const date = parseDate(time, {
          timezone,
        });

        if (!date) {
          return {
            status: 'error',
            message: 'Invalid date',
          };
        }

        const formattedMessage = telegramify(message);

        const id = nanoid();

        const { messageId } = await client.publishJSON({
          id: 'sss',
          url: `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`,
          headers: {
            'Content-Type': 'application/json',
          },
          callback: env.REMINDERS_AFTER_NOTIFY_CALLBACK_URL,
          body: {
            id,
            chat_id: ctx.chatId,
            text: formattedMessage,
            parse_mode: 'MarkdownV2',
          },
          notBefore: Math.floor(date.getTime() / 1000),
        });

        await prisma.reminder.create({
          data: {
            id,
            messageId,
            message: formattedMessage,
            remindAt: date,
            userId: ctx.from.id.toString(),
            groupId: ctx.chatId.toString(),
            timezone,
            status: ReminderStatus.SCHEDULED,
          },
        });

        return {
          status: 'success',
        };
      },
    }),
    getReminders: tool({
      description: 'get all reminders for the user.',
      parameters: z.object({}),
      execute: async () => {
        if (!ctx.chatId) {
          return {
            status: 'error',
            message: 'No chatId found',
          };
        }

        if (!ctx.from?.id) {
          return {
            status: 'error',
            message: 'No userId found',
          };
        }

        const reminders = await prisma.reminder.findMany({
          where: {
            groupId: ctx.chatId.toString(),
            userId: ctx.from.id.toString(),
            status: ReminderStatus.SCHEDULED,
          },
          select: {
            id: true,
            message: true,
            remindAt: true,
            timezone: true,
          },
        });

        return {
          status: 'success',
          reminders: reminders.map((reminder) => ({
            id: reminder.id,
            message: reminder.message,
            remindAt: new Intl.DateTimeFormat('en-US', {
              dateStyle: 'full',
              timeStyle: 'full',
              timeZone: reminder.timezone,
            }).format(reminder.remindAt),
          })),
        };
      },
    }),
    deleteReminder: tool({
      description: 'delete a reminder by id.',
      parameters: z.object({
        id: z.string().describe('the id of the reminder to delete'),
      }),
      execute: async ({ id }) => {
        const result = await prisma.reminder.update({
          where: {
            id,
          },
          data: {
            status: ReminderStatus.CANCELLED,
          },
          select: {
            messageId: true,
          },
        });

        await client.messages.delete(result.messageId);

        return {
          status: 'success',
        };
      },
    }),
    deleteAllReminders: tool({
      description: 'delete all reminders for the user.',
      parameters: z.object({}),
      execute: async () => {
        if (!ctx.chatId) {
          return {
            status: 'error',
            message: 'No chatId found',
          };
        }

        if (!ctx.from?.id) {
          return {
            status: 'error',
            message: 'No userId found',
          };
        }

        const reminders = await prisma.reminder.findMany({
          where: {
            groupId: ctx.chatId.toString(),
            userId: ctx.from.id.toString(),
            status: ReminderStatus.SCHEDULED,
          },
          select: {
            messageId: true,
          },
        });

        await prisma.reminder.updateMany({
          where: {
            groupId: ctx.chatId.toString(),
            userId: ctx.from.id.toString(),
            status: ReminderStatus.SCHEDULED,
          },
          data: {
            status: ReminderStatus.CANCELLED,
          },
        });

        await client.messages.deleteMany(reminders.map((reminder) => reminder.messageId));

        return {
          status: 'success',
        };
      },
    }),
  };
}
