import { Document, PhotoSize } from '@grammyjs/types';
import { logger } from '@trigger.dev/sdk/v3';
import { convertToCoreMessages, CoreMessage } from 'ai';

import { BotContext } from '@revelio/bot-utils';
import { env } from '@revelio/env/server';
import { generateAnswer } from '@revelio/llm/server';

import { createTDLib } from '../tdlib';

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

  const promptHeader = `Username: ${ctx.from.username ?? 'Unknown'}
User first name: ${ctx.from.first_name ?? 'Unknown'}
User second name: ${ctx.from.last_name ?? 'Unknown'}
User id: ${ctx.from.id ?? 'Unknown'}
Message id: ${ctx.message.message_id ?? 'Unknown'}

Message text from user:`;

  const messages: CoreMessage[] = photo
    ? [
        {
          role: 'user' as const,
          content: [
            {
              type: 'text' as const,
              text: `${promptHeader}
${prompt ?? 'What’s in this image?'}`,
            },
            {
              type: 'image' as const,
              image: await logger.trace('getPhotoUrl', () => getPhotoUrl(photo)),
            },
          ],
        },
      ]
    : convertToCoreMessages([
        {
          role: 'user',
          content: `${promptHeader}
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

  return photo;
}

async function uploadImg(blob: Blob) {
  const formData = new FormData();
  formData.append('file', blob);
  formData.append('requireSignedURLs', 'false');

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/images/v1`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
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
    console.error(errors);
    throw new Error(errors.join(', '));
  }

  if (!result.variants.length) {
    throw new Error('No variants found');
  }

  return new URL(result.variants[0]);
}

async function getPhotoUrl(photo: PhotoSize | Document) {
  const tdlib = await logger.trace('createTDLib', () => createTDLib());

  const result = await logger.trace('tdlib.downloadAsBuffer', () =>
    tdlib.downloadAsBuffer(photo.file_id),
  );

  await tdlib.close();

  const file = new File([result], photo.file_id, {
    type: 'mime_type' in photo ? (photo.mime_type ?? undefined) : undefined,
  });

  return logger.trace('uploadImg', () => uploadImg(file));
}
