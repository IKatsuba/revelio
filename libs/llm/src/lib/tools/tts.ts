import { Ratelimit } from '@upstash/ratelimit';
import { tool } from 'ai';
import { InputFile } from 'grammy';
import { z } from 'zod';

import { BotContext } from '@revelio/bot-utils';
import { formatSeconds } from '@revelio/utils';

import { textToSpeech } from '../text-to-speech';

export function ttsFactory(ctx: BotContext) {
  return tool({
    description: 'generate a speech from text',
    parameters: z.object({
      text: z.string().describe('the text for the speech'),
    }),
    execute: async ({ text }, { abortSignal }) => {
      const limit = ctx.session.plan === 'premium' ? 50000 : 10000;

      const imageRateLimit = new Ratelimit({
        redis: ctx.redis,
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

      const audioBuffer = await textToSpeech(ctx, text, {
        abortSignal,
      });

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
  });
}
