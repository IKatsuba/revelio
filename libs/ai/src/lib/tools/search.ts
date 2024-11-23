import { KyInstance } from '@agentic/core';
import { jina, JinaClient } from '@agentic/jina';
import { tool } from '@langchain/core/tools';
import ky from 'ky';
import { z } from 'zod';

import { injectBotContext } from '@revelio/bot-utils';
import { injectEnv } from '@revelio/env';

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

export function searchToolsFactory() {
  const env = injectEnv();
  const ctx = injectBotContext();

  const jinaApi = ky.extend({
    timeout: 1000 * 60 * 5,
    headers: {
      Authorization: `Bearer ${env.JINA_API_KEY}`,
    },
    fetch: (...args) => fetch(...args),
  });

  const jinaClient = new XJinaClient(jinaApi);

  return [
    tool(
      async ({ query }) => {
        const response = await fetch(`${env.PERPLEXITY_API_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.PERPLEXITY_API_KEY}`,
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
      {
        name: 'webSearch',
        description: 'Search the web',
        schema: z.object({
          query: z.string(),
        }),
      },
    ),
    tool(
      async ({ url, returnFormat }) => {
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
      {
        name: 'readUrl',
        description: 'Load and read a URL and return the content or a screenshot',
        schema: z.object({
          url: z.string(),
          returnFormat: z.enum(['text', 'html', 'markdown', 'screenshot']),
        }),
      },
    ),
    tool(
      async ({ query }) => {
        const response = await jinaClient.checkFact(query);

        return {
          result: response.data.result,
          factuality: response.data.factuality,
          reason: response.data.reason,
        };
      },
      {
        name: 'checkFact',
        description: 'Check a fact',
        schema: z.object({
          query: z.string(),
        }),
      },
    ),
  ];
}
