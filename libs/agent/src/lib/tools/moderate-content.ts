import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { moderate } from '@revelio/llm';

export function moderateContentFactory() {
  return tool(async ({ text }) => moderate(text), {
    name: 'moderateContent',
    description: 'moderate the content',
    schema: z.object({
      text: z.string().describe('the text to moderate'),
    }),
  });
}
