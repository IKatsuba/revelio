import { injectOpenAI } from '@revelio/openai';

export async function moderate(text: string, { signal }: { signal?: AbortSignal } = {}) {
  const openai = injectOpenAI();

  return openai.moderations.create(
    {
      model: 'omni-moderation-latest',
      input: text,
    },
    { signal },
  );
}
