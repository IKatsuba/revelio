import { openaiClient } from './openai';

export async function moderate(text: string, { signal }: { signal?: AbortSignal } = {}) {
  return openaiClient.moderations.create(
    {
      model: 'omni-moderation-latest',
      input: text,
    },
    { signal },
  );
}
