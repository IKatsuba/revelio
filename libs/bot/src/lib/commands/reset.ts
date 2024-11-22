import { BotContext } from '@revelio/bot-utils';
import { injectRedisClient } from '@revelio/redis';

export async function reset(ctx: BotContext) {
  const redis = injectRedisClient();

  await redis.del(`msg_list_${ctx.chatId}`);

  await ctx.reply('Conversation reset');
}
