import { env } from '@revelio/env/server';

import { openaiClient } from './openai';

export async function generateImage(prompt: string, { signal }: { signal?: AbortSignal } = {}) {
  const result = await openaiClient.images.generate(
    {
      prompt,
      n: 1,
      model: env.IMAGE_MODEL,
      quality: env.IMAGE_QUALITY,
      size: env.IMAGE_SIZE,
    },
    {
      signal,
    },
  );

  return result.data[0].url;
}
