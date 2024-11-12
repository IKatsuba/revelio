import { BotContext } from '@revelio/bot-utils';

export async function reset(ctx: BotContext) {
  await ctx.redis.del(`msg_list_${ctx.chatId}`);

  await ctx.reply('Conversation reset');
}
