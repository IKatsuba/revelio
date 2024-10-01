import { tasks } from '@trigger.dev/sdk/v3';

import { BotContext } from '@revelio/bot-utils';
import { TranscribeTask } from '@revelio/jobs';

export async function voice(ctx: BotContext) {
  await ctx.replyWithChatAction('typing');

  const file =
    ctx.message?.voice ?? ctx.message?.audio ?? ctx.message?.video_note ?? ctx.message?.video;

  if (!file) {
    console.log('No audio file found');
    await ctx.reply('Failed to transcribe audio');
    return;
  }

  if (!ctx.chatId) {
    console.log('No chatId found');
    await ctx.reply('Failed to transcribe audio');
    return;
  }

  await tasks.trigger<TranscribeTask>('transcribe', {
    fileId: file.file_id,
    chatId: ctx.chatId,
  });
}
