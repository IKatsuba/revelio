import { tool } from 'ai';
import { z } from 'zod';

import { BotContext } from '@revelio/bot-utils';

import { moderate } from '../moderate';

export function moderateContentFactory(ctx: BotContext) {
  return {
    moderateContent: tool({
      description: 'moderate the content',
      parameters: z.object({
        text: z.string().describe('the text to moderate'),
      }),
      execute: async ({ text }, { abortSignal }) => moderate(ctx, text, { signal: abortSignal }),
    }),
  };
}
