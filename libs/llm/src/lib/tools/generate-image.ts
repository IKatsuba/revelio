import { tool } from 'ai';
import { z } from 'zod';

import { BotContext } from '@revelio/bot-utils';

import { generateImage as openAIGenerateImage } from '../generate-image';

export function generateImageFactory(ctx: BotContext) {
  return tool({
    description: 'generate an image',
    parameters: z.object({
      prompt: z.string().describe('the prompt for the image'),
    }),
    execute: async ({ prompt }, { abortSignal }) => {
      const url = await openAIGenerateImage(prompt, {
        signal: abortSignal,
      });

      if (!url) {
        return {
          result: 'error',
        };
      }

      await ctx.replyWithChatAction('upload_photo');

      await ctx.replyWithPhoto(url);

      return {
        url,
        prompt,
      };
    },
  });
}
