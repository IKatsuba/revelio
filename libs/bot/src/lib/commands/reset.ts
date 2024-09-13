import { BotContext } from '../context';

export async function reset(ctx: BotContext) {
  ctx.session.messages = [];

  await ctx.reply('Conversation reset');
}
