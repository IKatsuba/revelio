import { KyInstance } from '@agentic/core';
import { jina, JinaClient } from '@agentic/jina';
import { tool } from 'ai';
import ky from 'ky';
import { z } from 'zod';

import { BotContext } from '@revelio/bot-utils';

class XJinaClient extends JinaClient {
  kyFactCheck: KyInstance;

  constructor(ky: KyInstance) {
    super({
      ky,
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
  const jinaApi = ky.extend({
    timeout: 1000 * 60 * 5,
    headers: {
      Authorization: `Bearer ${ctx.env.JINA_API_KEY}`,
    },
  });

  const jinaClient = new XJinaClient(jinaApi);

  return {
    webSearch: tool({
      description: 'Search the web',
      parameters: z.object({
        query: z.string(),
      }),
      async execute({ query }) {
        const response = await fetch(`${ctx.env.PERPLEXITY_API_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${ctx.env.PERPLEXITY_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.1-sonar-small-128k-online',
            messages: [
              { role: 'system', content: 'Be precise and concise.' },
              { role: 'user', content: query },
            ],
            stream: false,
          }),
        });

        const result = (await response.json()) as {
          id: string;
          model: string;
          created: number;
          usage: {
            prompt_tokens: number;
            completion_tokens: number;
            total_tokens: number;
          };
          citations: string[];
          object: string;
          choices: {
            index: number;
            finish_reason: string;
            message: {
              role: string;
              content: string;
            };
            delta: {
              role: string;
              content: string;
            };
          }[];
        };

        const { choices, citations } = result;

        const {
          message: { content },
        } = choices.find((choice) => choice.finish_reason === 'stop') ?? {
          message: { content: 'No results found' },
          citations: [],
        };

        return {
          result: content,
          citations,
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
