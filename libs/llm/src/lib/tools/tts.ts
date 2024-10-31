import { tool } from 'ai';
import { InputFile } from 'grammy';
import { z } from 'zod';

import { BotContext } from '@revelio/bot-utils';

import { textToSpeech } from '../text-to-speech';

export function ttsFactory(ctx: BotContext) {
  return tool({
    description: 'generate a speech from text',
    parameters: z.object({
      text: z.string().describe('the text for the speech'),
    }),
    execute: async ({ text }, { abortSignal }) => {
      const audioBuffer = await textToSpeech(text, {
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
        audioBuffer,
        text,
      };
    },
  });
}
