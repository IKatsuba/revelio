import { tasks } from '@trigger.dev/sdk/v3';

import { BotContext } from '@revelio/bot-utils';
import { TtsTask } from '@revelio/jobs';

export async function tts(ctx: BotContext) {
  await ctx.replyWithChatAction('record_voice');

  await tasks.trigger<TtsTask>('tts', ctx.update);
}
