import { tool } from '@langchain/core/tools';
import { Ratelimit } from '@upstash/ratelimit';
import { z } from 'zod';

import { injectBotContext } from '@revelio/bot-utils';
import { generateImage as openAIGenerateImage } from '@revelio/llm';
import { injectRedisClient } from '@revelio/redis';
import { formatSeconds } from '@revelio/utils';

export function generateImageFactory() {
  const ctx = injectBotContext();
  const redis = injectRedisClient();

  return tool(
    async ({ prompt }) => {
      const limit = ctx.session.plan === 'premium' ? 50 : 20;

      const imageRateLimit = new Ratelimit({
        redis: redis,
        prefix: 'image-rate-limit',
        limiter: Ratelimit.fixedWindow(limit, '28d'),
      });

      const { success, reset } = await imageRateLimit.limit(ctx.chatId!.toString());

      if (!success) {
        const remaining = reset - Date.now();

        return `You are out of image generation limits. Please try again in ${formatSeconds(Math.floor(remaining / 1000))}.`;
      }

      const url = await openAIGenerateImage(prompt);

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
    {
      name: 'generateImage',
      description: 'generate an image',
      schema: z.object({
        prompt: z.string().describe('the prompt for the image'),
      }),
    },
  );
}
