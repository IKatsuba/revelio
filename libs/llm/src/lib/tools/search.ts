import { jina, JinaClient } from '@agentic/jina';
import { tool } from 'ai';
import ky from 'ky';
import { z } from 'zod';

import { BotContext } from '@revelio/bot-utils';

const jinaApi = ky.extend({
  timeout: 1000 * 60 * 5,
});

const jinaClient = new JinaClient({
  ky: jinaApi,
});

export function searchToolsFactory(ctx: BotContext) {
  return {
    webSearch: tool({
      description: 'Search the web',
      parameters: z.object({
        query: z.string(),
      }),
      async execute({ query }) {
        return jinaClient.search({ query, json: true });
      },
    }),
    readUrl: tool({
      description: 'Read a URL',
      parameters: z.object({
        url: z.string(),
        returnFormat: z.enum(['text', 'html', 'markdown', 'screenshot']),
      }),
      async execute({ url, returnFormat }) {
        const result = await jinaClient.readUrl({
          url,
          returnFormat,
          json: true,
          timeout: 1000 * 60,
        });

        if (returnFormat === 'screenshot') {
          const imageUrl = (result as unknown as jina.ReaderResponseScreenshot).data.screenshotUrl;

          if (!imageUrl) {
            return {
              result: 'error',
              message: 'Failed to generate screenshot',
            };
          }

          await ctx.replyWithChatAction('upload_photo');
          await ctx.replyWithPhoto(imageUrl);

          return {
            result: 'Screenshot generated and already sent',
          };
        }

        return result;
      },
    }),
  };
}
