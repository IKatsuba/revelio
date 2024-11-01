import { BotContext } from '@revelio/bot-utils';
import { redis } from '@revelio/redis';

export async function reset(ctx: BotContext) {
  await redis.del(`msg_list_${ctx.chatId}`);

  await ctx.reply('Conversation reset');
}
