import { env } from '@revelio/env/server';

import { openaiClient } from './openai';

export async function generateImage(prompt: string) {
  const result = await openaiClient.images.generate({
    prompt,
    n: 1,
    model: env.IMAGE_MODEL,
    quality: env.IMAGE_QUALITY,
    style: env.IMAGE_STYLE,
    size: env.IMAGE_SIZE,
  });

  return result.data[0].url;
}
