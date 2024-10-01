import { BotContext } from '@revelio/bot-utils';

export async function reset(ctx: BotContext) {
  ctx.session.messages = [];

  await ctx.reply('Conversation reset');
}
