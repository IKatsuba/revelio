import * as Core from 'openai/src/core';

import { injectEnv } from '@revelio/env';
import { injectOpenAI } from '@revelio/openai';

export async function transcribe(fileId: string, file: Core.Uploadable) {
  const openai = injectOpenAI();
  const env = injectEnv();

  const result = await openai.audio.transcriptions.create(
    {
      model: 'whisper-1',
      file,
      prompt: env.WHISPER_PROMPT,
    },
    {
      headers: {
        'cf-aig-cache-key': fileId,
      },
    },
  );

  return result.text;
}
