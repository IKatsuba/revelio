import { Document, PhotoSize } from '@grammyjs/types';
import { trace } from '@opentelemetry/api';
import { convertToCoreMessages, CoreMessage } from 'ai';

import { BotContext } from '@revelio/bot-utils';
import { generateAnswer } from '@revelio/llm';

export async function prompt(ctx: BotContext) {
  ctx.logger.debug('Prompt command');

  await ctx.replyWithChatAction('typing');

  const prompt = ctx.message?.text || ctx.message?.caption || ctx.transcription;
  const photo = ctx.session.plan === 'free' ? null : await getPhoto(ctx);

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

  const messages: CoreMessage[] = photo
    ? [
        {
          role: 'user' as const,
          content: [
            {
              type: 'text' as const,
              text: `${getMessageHeader(ctx)}\n${prompt ?? 'What’s in this image?'}`,
            },
            {
              type: 'image' as const,
              image: await getPhotoUrl(ctx, photo),
            },
          ],
        },
      ]
    : convertToCoreMessages([
        {
          role: 'user',
          content: `${getMessageHeader(ctx)}\n${prompt ?? ''}`,
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

  if (!photo.file_size) {
    return null;
  }

  if (photo.file_size > 20 * 1024 * 1024) {
    return null;
  }

  return photo;
}

async function getPhotoUrl(ctx: BotContext, photo: PhotoSize | Document) {
  const fileDescription = await ctx.api.getFile(photo.file_id);

  const telegramFileUrl = `${ctx.env.TELEGRAM_API_URL}/file/bot${ctx.env.BOT_TOKEN}/${fileDescription.file_path}`;

  const formData = new FormData();
  formData.append('url', telegramFileUrl);
  formData.append(
    'metadata',
    JSON.stringify({
      fileId: photo.file_id,
    }),
  );
  formData.append('requireSignedURLs', 'false');

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ctx.env.CLOUDFLARE_ACCOUNT_ID}/images/v1`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ctx.env.CLOUDFLARE_IMAGE_API_TOKEN}`,
      },
      body: formData,
    },
  );

  const json = await response.json();

  const { result, success, errors } = json as {
    result: { variants: string[] };
    success: boolean;
    errors: string[];
  };

  if (!success) {
    ctx.logger.error('Failed to upload image to Cloudflare', { errors });
    trace.getActiveSpan()?.recordException(errors.join('. '));
    throw new Error(errors.join(', '));
  }

  if (!result.variants.length) {
    throw new Error('No variants found');
  }

  return new URL(result.variants[0]);
}

function getMessageHeader(ctx: BotContext): string {
  return `Username: ${ctx.from?.username ?? 'Unknown'}
User first name: ${ctx.from?.first_name ?? 'Unknown'}
User second name: ${ctx.from?.last_name ?? 'Unknown'}
User id: ${ctx.from?.id ?? 'Unknown'}
Message id: ${ctx.message?.message_id ?? 'Unknown'}
${
  ctx.message?.reply_to_message
    ? `---
Reply to message id: ${ctx.message.reply_to_message.message_id}
`
    : ''
}
---
Message text from user:`;
}
