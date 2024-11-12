import { BotContext } from '@revelio/bot-utils';

export async function textToSpeech(
  ctx: BotContext,
  text: string,
  { abortSignal }: { abortSignal?: AbortSignal } = {},
) {
  const result = await ctx.openai.audio.speech.create(
    {
      input: text,
      voice: ctx.env.TTS_VOICE,
      model: ctx.env.TTS_MODEL,
      response_format: 'opus',
    },
    {
      signal: abortSignal,
    },
  );

  return Buffer.from(await result.arrayBuffer());
}
