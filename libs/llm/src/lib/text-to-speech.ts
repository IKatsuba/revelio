import { env } from '@revelio/env/server';

import { openaiClient } from './openai';

export async function textToSpeech(text: string) {
  const result = await openaiClient.audio.speech.create({
    input: text,
    voice: env.TTS_VOICE,
    model: env.TTS_MODEL,
    response_format: 'opus',
  });

  return Buffer.from(await result.arrayBuffer());
}
