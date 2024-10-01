import { tasks } from '@trigger.dev/sdk/v3';

import { BotContext } from '@revelio/bot-utils';
import { TtsTask } from '@revelio/jobs';

export async function tts(ctx: BotContext) {
  await ctx.replyWithChatAction('record_voice');

  const prompt = ctx.message?.text?.replace(/^\/tts/, '').trim();

  if (!prompt) {
    await ctx.reply('Please provide a prompt for the speech generation');
    return;
  }

  if (!ctx.chatId) {
    await ctx.reply('Failed to get chatId');
    return;
  }

  await tasks.trigger<TtsTask>('tts', { prompt, chatId: ctx.chatId });
}
