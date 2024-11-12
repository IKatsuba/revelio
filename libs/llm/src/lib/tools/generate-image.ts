import { Ratelimit } from '@upstash/ratelimit';
import { tool } from 'ai';
import { z } from 'zod';

import { BotContext } from '@revelio/bot-utils';
import { formatSeconds } from '@revelio/utils';

import { generateImage as openAIGenerateImage } from '../generate-image';

export function generateImageFactory(ctx: BotContext) {
  return tool({
    description: 'generate an image',
    parameters: z.object({
      prompt: z.string().describe('the prompt for the image'),
    }),
    execute: async ({ prompt }, { abortSignal }) => {
      const limit = ctx.session.plan === 'premium' ? 50 : 20;

      const imageRateLimit = new Ratelimit({
        redis: ctx.redis,
        prefix: 'image-rate-limit',
        limiter: Ratelimit.fixedWindow(limit, '28d'),
      });

      const { success, reset } = await imageRateLimit.limit(ctx.chatId!.toString());

      if (!success) {
        const remaining = reset - Date.now();

        return `You are out of image generation limits. Please try again in ${formatSeconds(Math.floor(remaining / 1000))}.`;
      }

      const url = await openAIGenerateImage(ctx, prompt, {
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
        result: 'Image generated and sent',
        prompt,
      };
    },
  });
}
