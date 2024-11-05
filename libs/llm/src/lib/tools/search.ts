import { KyInstance } from '@agentic/core';
import { jina, JinaClient } from '@agentic/jina';
import { tool } from 'ai';
import ky from 'ky';
import { z } from 'zod';

import { BotContext } from '@revelio/bot-utils';
import { env } from '@revelio/env/server';

const jinaApi = ky.extend({
  timeout: 1000 * 60 * 5,
});

class XJinaClient extends JinaClient {
  kyFactCheck: KyInstance;

  constructor() {
    super({
      ky: jinaApi,
    });

    this.kyFactCheck = jinaApi.extend({
      prefixUrl: 'https://g.jina.ai',
      headers: { Authorization: `Bearer ${env.JINA_API_KEY}` },
    });
  }

  async checkFact(query: string) {
    return this.kyFactCheck.get(query, { headers: this._getHeadersFromOptions({ json: true }) });
  }
}

const jinaClient = new XJinaClient();

export function searchToolsFactory(ctx: BotContext) {
  return {
    webSearch: tool({
      description: 'Search the web',
      parameters: z.object({
        query: z.string(),
      }),
      async execute({ query }) {
        const result = await jinaClient.search({ query, json: true });

        return result.data.map((item) => {
          const tokens = (item as unknown as { usage: { tokens: number } })?.usage?.tokens;

          return {
            title: item.title,
            description: item.description,
            url: item.url,
            publishedTime: item.publishedTime,
            content: tokens && tokens >= 10000 ? 'Content too long to display' : item.content,
          };
        });
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
          timeout: 1000 * 60 * 5,
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
    checkFact: tool({
      description: 'Check a fact',
      parameters: z.object({
        query: z.string(),
      }),
      async execute({ query }) {
        const response = await jinaClient.checkFact(query);

        return response.json();
      },
    }),
  };
}
