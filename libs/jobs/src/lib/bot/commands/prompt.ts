import { convertToCoreMessages } from 'ai';

import { BotContext } from '@revelio/bot-utils';
import { env } from '@revelio/env/server';
import { generateAnswer } from '@revelio/llm/server';

export async function prompt(ctx: BotContext) {
  await ctx.replyWithChatAction('typing');

  const prompt = ctx.message?.text || ctx.message?.caption || ctx.transcription;
  const photo = await getPhoto(ctx);

  if (!prompt && !photo) {
    await ctx.reply('Please provide a prompt');
    return;
  }

  if (!ctx.chatId) {
    await ctx.reply('This command is only available in a chat');
    return;
  }

  if (!ctx.message?.message_id) {
    await ctx.reply('Message id is missing');
    return;
  }

  if (!ctx.from?.id) {
    await ctx.reply('User id is missing');
    return;
  }

  const messages = photo
    ? [
        {
          role: 'user' as const,
          content: [
            {
              type: 'text' as const,
              text: `${ctx.from.first_name ?? ctx.from.username}: ${prompt ?? 'What’s in this image?'}`,
            },
            {
              type: 'image' as const,
              image: photo,
            },
          ],
        },
      ]
    : convertToCoreMessages([
        {
          role: 'user',
          content: `Username: ${ctx.from.username ?? 'Unknown'}
User first name: ${ctx.from.first_name ?? 'Unknown'}
User second name: ${ctx.from.last_name ?? 'Unknown'}
User id: ${ctx.from.id ?? 'Unknown'}
Message id: ${ctx.message.message_id ?? 'Unknown'}

Message text from user:
${prompt ?? ''}`,
        },
      ]);

  await generateAnswer(ctx, { messages });
}

async function getPhoto(ctx: BotContext) {
  const photos = ctx.message?.photo ?? [];

  // find the biggest photo
  const photo =
    ctx.message?.document ??
    photos.reduce(
      (acc, cur) => ((cur.file_size ?? 0) > (acc.file_size ?? 0) ? cur : acc),
      photos[0],
    );

  if (!photo || ('mime_type' in photo && !photo.mime_type?.startsWith('image/'))) {
    return null;
  }

  const fileData = await ctx.api.getFile(photo.file_id);

  return new URL(`https://api.telegram.org/file/bot${env.BOT_TOKEN}/${fileData.file_path}`);
}
