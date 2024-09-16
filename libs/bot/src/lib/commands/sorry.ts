import { BotContext } from '../context';

export async function sorry(ctx: BotContext) {
  await ctx.reply('Sorry, I am not able to chat in groups. Yet. Stay tuned!');
}
