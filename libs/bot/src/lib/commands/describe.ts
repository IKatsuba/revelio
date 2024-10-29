import { tasks } from '@trigger.dev/sdk/v3';

import { BotContext } from '@revelio/bot-utils';
import { DescribeTask } from '@revelio/jobs';

export async function describe(ctx: BotContext) {
  await ctx.replyWithChatAction('typing');

  if (!ctx.message?.message_id) {
    await ctx.reply('Failed to transcribe image');
    return;
  }

  if (!ctx.from?.id) {
    await ctx.reply('Failed to transcribe image');
    return;
  }

  const photos = ctx.message?.photo ?? [];

  // find the biggest photo
  const photo =
    ctx.message?.document ??
    photos.reduce(
      (acc, cur) => ((cur.file_size ?? 0) > (acc.file_size ?? 0) ? cur : acc),
      photos[0],
    );

  if (!photo || ('mime_type' in photo && !photo.mime_type?.startsWith('image/'))) {
    await ctx.reply('Failed to transcribe image');
    return;
  }

  await tasks.trigger<DescribeTask>('describe', {
    chatId: ctx.chatId!,
    fileId: photo.file_id,
    caption: ctx.message?.caption,
    messageId: ctx.message.message_id,
    userId: ctx.from.id,
  });
}
