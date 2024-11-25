import { injectMessageHistory } from '@revelio/agent';
import { BotContext } from '@revelio/bot-utils';

export async function reset(ctx: BotContext) {
  const history = injectMessageHistory();

  await history.clear();

  await ctx.reply('Conversation reset');
}
