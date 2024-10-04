import { tool } from 'ai';
import { z } from 'zod';

import { generateImage as openAIGenerateImage } from '../generate-image';

export const generateImage = tool({
  description: 'generate an image',
  parameters: z.object({
    prompt: z.string().describe('the prompt for the image'),
  }),
  execute: async ({ prompt }) => {
    const url = await openAIGenerateImage(prompt);

    return {
      url,
      prompt: 'Here is the image you requested.',
    };
  },
});
