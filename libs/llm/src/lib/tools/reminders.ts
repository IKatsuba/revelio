import { Client } from '@upstash/qstash';
import { tool } from 'ai';
import { parseDate } from 'chrono-node';
import { z } from 'zod';

import { telegramify } from '@revelio/bot-utils';
import { env } from '@revelio/env/server';

const client = new Client({
  token: env.QSTASH_TOKEN,
  baseUrl: env.QSTASH_URL,
  retry: {
    retries: 6,
    backoff: (retry_count) => Math.exp(retry_count) * 50,
  },
});

export function reminderToolFactory({ chatId }: { chatId: number }) {
  return tool({
    description: 'create a reminder then notify the user.',
    parameters: z.object({
      message: z.string().describe('a reminder message to the user in markdown'),
      time: z
        .string()
        .describe(
          'a natural language date like "tomorrow at 3pm", Today, Tomorrow, Yesterday, Last Friday, 17 August 2013 - 19 August 2013, This Friday from 13:00 - 16.00, 5 days ago, 2 weeks from now, Sat Aug 17 2013 18:40:39 GMT+0900 (JST), 2014-11-30T08:15:30-05:30.',
        ),
      timezone: z.string().describe('the timezone to use for the reminder'),
    }),
    execute: async ({ message, time, timezone }) => {
      const date = parseDate(time, {
        timezone,
      });

      if (!date) {
        return {
          status: 'error',
          message: 'Invalid date',
        };
      }

      await client.publishJSON({
        url: `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`,
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          chat_id: chatId,
          text: telegramify(message),
          parse_mode: 'MarkdownV2',
        },
        notBefore: Math.floor(date.getTime() / 1000),
      });

      return {
        status: 'success',
      };
    },
  });
}
