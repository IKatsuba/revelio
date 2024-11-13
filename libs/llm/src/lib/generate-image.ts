import { BotContext } from '@revelio/bot-utils';

export async function generateImage(
  ctx: BotContext,
  prompt: string,
  { signal }: { signal?: AbortSignal } = {},
) {
  const result = await ctx.openai.images.generate(
    {
      prompt,
      n: 1,
      model: ctx.env.IMAGE_MODEL,
      quality: ctx.env.IMAGE_QUALITY,
      size: ctx.env.IMAGE_SIZE,
    },
    {
      signal,
    },
  );

  return result.data[0].url;
}
