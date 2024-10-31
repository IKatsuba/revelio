import { tasks } from '@trigger.dev/sdk/v3';

import { BotContext } from '@revelio/bot-utils';
import { PromptTask } from '@revelio/jobs';

export async function tts(ctx: BotContext) {
  await ctx.replyWithChatAction('record_voice');

  await tasks.trigger<PromptTask>('prompt', ctx.update);
}
