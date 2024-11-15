import { ReminderStatus } from '@prisma/client';
import { Client } from '@upstash/qstash';
import { tool } from 'ai';
import { parseDate } from 'chrono-node';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { BotContext, telegramify } from '@revelio/bot-utils';

function createClient(ctx: BotContext) {
  return new Client({
    token: ctx.env.QSTASH_TOKEN,
    baseUrl: ctx.env.QSTASH_URL,
    retry: {
      retries: 6,
      backoff: (retry_count) => Math.exp(retry_count) * 50,
    },
  });
}

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
      async execute({ message, time, timezone }) {
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

        ctx.logger.info('Creating reminder', { message, time, timezone });

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

        const { messageId } = await createClient(ctx).publishJSON({
          url: ctx.env.REMINDERS_AFTER_NOTIFY_CALLBACK_URL,
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

        await ctx.sql`
          INSERT INTO "Reminder" ("id", "messageId", "message", "remindAt", "userId", "groupId", "timezone", "status",
                                  "updatedAt")
          VALUES (${id}, ${messageId}, ${formattedMessage}, ${date}, ${ctx.from.id.toString()},
                  ${ctx.chatId.toString()}, ${timezone}, ${ReminderStatus.SCHEDULED}, NOW())
        `;

        return {
          status: 'success',
        };
      },
    }),
    getReminders: tool({
      description: 'get all reminders for the user.',
      parameters: z.object({}),
      async execute() {
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

        const reminders = await ctx.sql`
          SELECT "id", "message", "remindAt", "timezone"
          FROM "Reminder"
          WHERE "groupId" = ${ctx.chatId.toString()}
            AND "userId" = ${ctx.from.id.toString()}
            AND "status" = ${ReminderStatus.SCHEDULED}
        `;

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
      async execute({ id }) {
        const [result] = await ctx.sql`
          UPDATE "Reminder"
          SET "status"    = ${ReminderStatus.CANCELLED},
              "updatedAt" = NOW()
          WHERE "id" = ${id}
          RETURNING "messageId";
        `;

        await createClient(ctx).messages.delete(result.messageId);

        return {
          status: 'success',
        };
      },
    }),
    deleteAllReminders: tool({
      description: 'delete all reminders for the user.',
      parameters: z.object({}),
      async execute() {
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

        const reminders = await ctx.sql`
          SELECT "messageId"
          FROM "Reminder"
          WHERE "groupId" = ${ctx.chatId.toString()}
            AND "userId" = ${ctx.from.id.toString()}
            AND "status" = ${ReminderStatus.SCHEDULED}
        `;

        await ctx.sql`
          UPDATE "Reminder"
          SET "status"    = ${ReminderStatus.CANCELLED},
              "updatedAt" = NOW()
          WHERE "groupId" = ${ctx.chatId.toString()}
            AND "userId" = ${ctx.from.id.toString()}
            AND "status" = ${ReminderStatus.SCHEDULED}
        `;

        await createClient(ctx).messages.deleteMany(
          reminders.map((reminder) => reminder.messageId),
        );

        return {
          status: 'success',
        };
      },
    }),
  };
}
