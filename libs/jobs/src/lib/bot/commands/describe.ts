import { BotContext, sendLongText } from '@revelio/bot-utils';
import { env } from '@revelio/env/server';
import { generateTextFactory } from '@revelio/llm/server';

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

  const fileData = await ctx.api.getFile(photo.file_id);

  const messages = [
    ...ctx.session.messages,
    {
      role: 'user' as const,
      content: [
        { type: 'text' as const, text: ctx.message?.caption ?? 'What’s in this image?' },
        {
          type: 'image' as const,
          image: new URL(`https://api.telegram.org/file/bot${env.BOT_TOKEN}/${fileData.file_path}`),
        },
      ],
    },
  ].slice(-env.MAX_HISTORY_SIZE);

  const generateText = generateTextFactory({
    chatId: ctx.chatId!,
    messageId: ctx.message.message_id,
    userId: ctx.from.id,
    plan: ctx.session.plan,
  });

  const response = await generateText(messages);

  ctx.session.messages = [...messages, ...response.response.messages].slice(-env.MAX_HISTORY_SIZE);

  await sendLongText(ctx, response.text);
}
