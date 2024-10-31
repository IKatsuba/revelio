import { tasks } from '@trigger.dev/sdk/v3';

import { BotContext } from '@revelio/bot-utils';
import { DescribeTask } from '@revelio/jobs';

export async function describe(ctx: BotContext) {
  await ctx.replyWithChatAction('typing');

  await tasks.trigger<DescribeTask>('describe', ctx.update);
}
