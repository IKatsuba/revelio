import { BotContext } from '@revelio/bot-utils';

export async function moderate(
  ctx: BotContext,
  text: string,
  { signal }: { signal?: AbortSignal } = {},
) {
  return ctx.openai.moderations.create(
    {
      model: 'omni-moderation-latest',
      input: text,
    },
    { signal },
  );
}
