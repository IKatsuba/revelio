import * as Core from 'openai/src/core';

import { BotContext } from '@revelio/bot-utils';

export async function transcribe(ctx: BotContext, fileId: string, file: Core.Uploadable) {
  const result = await ctx.openai.audio.transcriptions.create(
    {
      model: 'whisper-1',
      file,
      prompt: ctx.env.WHISPER_PROMPT,
    },
    {
      headers: {
        'cf-aig-cache-key': fileId,
      },
    },
  );

  return result.text;
}
