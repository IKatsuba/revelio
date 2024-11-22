import { injectEnv } from '@revelio/env';
import { injectOpenAI } from '@revelio/openai';

export async function textToSpeech(
  text: string,
  { abortSignal }: { abortSignal?: AbortSignal } = {},
) {
  const openai = injectOpenAI();
  const env = injectEnv();

  const result = await openai.audio.speech.create(
    {
      input: text,
      voice: env.TTS_VOICE,
      model: env.TTS_MODEL,
      response_format: 'opus',
    },
    {
      signal: abortSignal,
    },
  );

  return Buffer.from(await result.arrayBuffer());
}
