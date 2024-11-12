import { KyInstance } from '@agentic/core';
import { jina, JinaClient } from '@agentic/jina';
import { MarkdownTextSplitter } from '@langchain/textsplitters';
import { Redis } from '@upstash/redis/cloudflare';
import { Index } from '@upstash/vector';
import { tool } from 'ai';
import ky from 'ky';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { BotContext } from '@revelio/bot-utils';

class XJinaClient extends JinaClient {
  kyFactCheck: KyInstance;

  constructor(ky: KyInstance, apiKey: string) {
    super({
      ky,
      apiKey,
    });

    this.kyFactCheck = ky.extend({
      prefixUrl: 'https://g.jina.ai',
    });
  }

  async checkFact(query: string): Promise<{
    code: number;
    status: number;
    data: {
      factuality: number;
      result: boolean;
      reason: string;
      usage: {
        tokens: number;
      };
      references: {
        url: string;
        keyQuote: string;
        isSupportive: string;
      }[];
    };
  }> {
    const response = await this.kyFactCheck.get(query, {
      headers: this._getHeadersFromOptions({ json: true }),
    });

    return response.json();
  }
}

export function searchToolsFactory(ctx: BotContext) {
  const index = new Index({
    url: ctx.env.WEB_SEARCH_VECTOR_REST_URL,
    token: ctx.env.WEB_SEARCH_VECTOR_REST_TOKEN,
  });

  const redis = new Redis({
    url: ctx.env.UPSTASH_REDIS_URL,
    token: ctx.env.UPSTASH_REDIS_TOKEN,
  });

  const jinaApi = ky.extend({
    timeout: 1000 * 60 * 5,
  });

  const jinaClient = new XJinaClient(jinaApi, ctx.env.JINA_API_KEY);

  return {
    webSearch: tool({
      description: 'Search the web',
      parameters: z.object({
        query: z.string(),
      }),
      async execute({ query }) {
        console.log('searching', query);
        const { data: items } = await jinaClient.search({ query, json: true });

        console.log('items', items);
        const mdSplitter = new MarkdownTextSplitter({
          chunkSize: 1000,
          chunkOverlap: 0,
        });

        for (const item of items) {
          if (await redis.get(`indexed:${item.url}`)) {
            console.log('already indexed', item.url);
            continue;
          }

          const docs = await mdSplitter.createDocuments([item.content || item.title]);

          docs.length &&
            (await index.upsert(
              docs.map((doc) => ({
                id: nanoid(),
                data: doc.pageContent,
                metadata: {
                  title: item.title,
                  url: item.url,
                  loc: doc.metadata.loc,
                },
              })),
            ));

          console.log('indexed', item.url);
          await redis.set(`indexed:${item.url}`, true, {
            ex: 60 * 60 * 24 * 7,
          });
        }

        const searchContext = await index.query<{
          url: string;
          title: string;
          loc: {
            lines: {
              from: number;
              to: number;
            };
          };
        }>({
          data: query,
          filter: items.map((item) => `url = '${item.url}'`).join(' OR '),
          topK: 5,
          includeData: true,
          includeMetadata: true,
        });

        const groupedSearchContext = searchContext.reduce(
          (acc, item) => {
            if (!acc[item.metadata!.url]) {
              acc[item.metadata!.url] = [];
            }

            acc[item.metadata!.url].push(item);

            return acc;
          },
          {} as Record<string, typeof searchContext>,
        );

        const sortedSearchContext = Object.entries(groupedSearchContext).map(([url, items]) => [
          url,
          items.sort((a, b) => a.metadata!.loc.lines.from - b.metadata!.loc.lines.from),
        ]) as [string, typeof searchContext][];

        return {
          result: sortedSearchContext
            .map(([url, items]) =>
              items
                .map((item) => {
                  const { title } = item.metadata!;

                  return `**[${title}](${url})**\n\nContext:\n${item.data}`;
                })
                .join('\n\n---\n\n'),
            )
            .join('\n\n---\n\n'),
        };
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

        return {
          result: response.data.result,
          factuality: response.data.factuality,
          reason: response.data.reason,
        };
      },
    }),
  };
}
