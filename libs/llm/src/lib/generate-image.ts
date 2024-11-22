import { injectEnv } from '@revelio/env';
import { injectOpenAI } from '@revelio/openai';

export async function generateImage(prompt: string, { signal }: { signal?: AbortSignal } = {}) {
  const openai = injectOpenAI();
  const env = injectEnv();

  const result = await openai.images.generate(
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
