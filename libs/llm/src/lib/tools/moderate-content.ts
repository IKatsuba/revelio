import { tool } from 'ai';
import { z } from 'zod';

import { moderate } from '../moderate';

export function moderateContentFactory() {
  return {
    moderateContent: tool({
      description: 'moderate the content',
      parameters: z.object({
        text: z.string().describe('the text to moderate'),
      }),
      execute: async ({ text }, { abortSignal }) => moderate(text, { signal: abortSignal }),
    }),
  };
}
