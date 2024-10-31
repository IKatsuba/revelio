import { BotContext } from '@revelio/bot-utils';

export async function voice(ctx: BotContext) {
  await ctx.reply('This feature currently disabled');
  return;
}
