import { tool } from '@langchain/core/tools';
import { Ratelimit } from '@upstash/ratelimit';
import { InputFile } from 'grammy';
import { z } from 'zod';

import { injectBotContext } from '@revelio/bot-utils';
import { textToSpeech } from '@revelio/llm';
import { injectRedisClient } from '@revelio/redis';
import { formatSeconds } from '@revelio/utils';

export function ttsFactory() {
  const redis = injectRedisClient();
  const ctx = injectBotContext();

  return tool(
    async ({ text }) => {
      const limit = ctx.session.plan === 'premium' ? 50000 : 10000;

      const imageRateLimit = new Ratelimit({
        redis,
        prefix: 'tts-rate-limit',
        limiter: Ratelimit.fixedWindow(limit, '28d'),
      });

      const { success, reset } = await imageRateLimit.limit(ctx.chatId!.toString(), {
        rate: text.length,
      });

      if (!success) {
        const remaining = reset - Date.now();

        return `You are out of limit. Please wait ${formatSeconds(Math.floor(remaining / 1000))} to try again.`;
      }

      const audioBuffer = await textToSpeech(text);

      if (!audioBuffer) {
        return {
          result: 'error',
        };
      }

      await ctx.replyWithChatAction('upload_voice');

      await ctx.replyWithVoice(new InputFile(audioBuffer));

      return {
        result: 'success',
        text,
      };
    },
    {
      name: 'textToSpeech',
      description: 'generate a speech from text',
      schema: z.object({
        text: z.string().describe('the text for the speech'),
      }),
    },
  );
}
