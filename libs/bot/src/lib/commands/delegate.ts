import { BotContext } from '@revelio/bot-utils';

export async function delegate(ctx: BotContext) {
  await ctx.replyWithChatAction('typing');

  await ctx.reply(`I'm sorry, I don't understand that command. Please try again.`);
}
