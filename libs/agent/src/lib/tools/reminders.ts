import { tool } from '@langchain/core/tools';
import { Client } from '@upstash/qstash';
import { parseDate } from 'chrono-node';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { injectBotContext, telegramify } from '@revelio/bot-utils';
import { injectEnv } from '@revelio/env';
import { injectLogger } from '@revelio/logger';
import { injectPrisma } from '@revelio/prisma';

function createClient() {
  const env = injectEnv();

  return new Client({
    token: env.QSTASH_TOKEN,
    baseUrl: env.QSTASH_URL,
    retry: {
      retries: 6,
      backoff: (retry_count) => Math.exp(retry_count) * 50,
    },
  });
}

export function reminderToolFactory() {
  const logger = injectLogger();
  const ctx = injectBotContext();
  const env = injectEnv();
  const prisma = injectPrisma();

  return [
    tool(
      async ({ message, time, timezone }) => {
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

        logger.info('Creating reminder', { message, time, timezone });

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

        const { messageId } = await createClient().publishJSON({
          url: `${env.BASE_URL}/api/reminders/after-notify`,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            id,
            update: ctx.update,
            text: formattedMessage,
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
            status: 'scheduled',
          },
        });

        return {
          status: 'success',
        };
      },
      {
        name: 'createReminder',
        description: 'create a reminder then notify the user.',
        schema: z.object({
          message: z.string().describe('a reminder message to the user in markdown'),
          time: z
            .string()
            .describe(
              'a natural language date like "tomorrow at 3pm", Today, Tomorrow, Yesterday, Last Friday, 17 August 2013 - 19 August 2013, This Friday from 13:00 - 16.00, 5 days ago, 2 weeks from now, next year, etc.',
            ),
          timezone: z.string().describe('the timezone to use for the reminder'),
        }),
      },
    ),
    tool(
      async () => {
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
            status: 'scheduled',
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
      {
        name: 'getReminders',
        description: 'get all reminders for the user.',
        schema: z.object({}),
      },
    ),
    tool(
      async ({ id }) => {
        const result = await prisma.reminder.update({
          where: {
            id,
          },
          data: {
            status: 'cancelled',
          },
          select: {
            messageId: true,
          },
        });

        await createClient().messages.delete(result.messageId);

        return {
          status: 'success',
        };
      },
      {
        name: 'deleteReminder',
        description: 'delete a reminder by id.',
        schema: z.object({
          id: z.string().describe('the id of the reminder to delete'),
        }),
      },
    ),
    tool(
      async () => {
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
            status: 'scheduled',
          },
          select: {
            messageId: true,
          },
        });

        await prisma.reminder.updateMany({
          where: {
            groupId: ctx.chatId.toString(),
            userId: ctx.from.id.toString(),
            status: 'scheduled',
          },
          data: {
            status: 'cancelled',
          },
        });

        await createClient().messages.deleteMany(reminders.map((reminder) => reminder.messageId));

        return {
          status: 'success',
        };
      },
      {
        name: 'deleteAllReminders',
        description: 'delete all reminders for the user.',
        schema: z.object({}),
      },
    ),
  ];
}
