import * as Core from 'openai/src/core';

import { env } from '@revelio/env/server';

import { openaiClient } from './openai';

export async function transcribe(fileId: string, file: Core.Uploadable) {
  const result = await openaiClient.audio.transcriptions.create(
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
