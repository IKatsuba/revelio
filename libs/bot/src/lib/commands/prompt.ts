import { Document, PhotoSize } from '@grammyjs/types';
import { HumanMessage } from '@langchain/core/messages';
import { trace } from '@opentelemetry/api';

import { createHumanMessage, messageTemplate, runAgentAndReply } from '@revelio/agent';
import { BotContext, injectBotContext } from '@revelio/bot-utils';
import { injectEnv } from '@revelio/env';
import { injectLogger } from '@revelio/logger';

export async function prompt(ctx: BotContext) {
  const logger = injectLogger();

  logger.debug('Prompt command');

  await ctx.replyWithChatAction('typing');

  const messagePrompt = ctx.message?.text || ctx.message?.caption || ctx.transcription;
  ctx.prompt = await createHumanMessage(messagePrompt ?? '');

  const photo = ctx.session.plan === 'free' ? null : await getPhoto(ctx);

  if (!messagePrompt && !photo) {
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

  if (photo) {
    ctx.photoUrl = (await getPhotoUrl(photo)).toString();

    ctx.prompt = new HumanMessage({
      content: [
        {
          type: 'text',
          text: ctx.prompt.content,
        },
        {
          type: 'image_url',
          image_url: {
            url: ctx.photoUrl,
          },
        },
      ],
    });
  }

  if (ctx.message.reply_to_message) {
    const repliedMsgText = await messageTemplate.format({
      username: ctx.message.reply_to_message.from?.username ?? 'Unknown',
      firstName: ctx.message.reply_to_message.from?.first_name ?? 'Unknown',
      lastName: ctx.message.reply_to_message.from?.last_name ?? 'Unknown',
      userId: ctx.message.reply_to_message.from?.id ?? 'Unknown',
      messageId: ctx.message.reply_to_message.message_id ?? 'Unknown',
      messageText: ctx.message.reply_to_message.text ?? 'Unknown',
    });

    const originMsgText = await messageTemplate.format({
      username: ctx.from?.username ?? 'Unknown',
      firstName: ctx.from?.first_name ?? 'Unknown',
      lastName: ctx.from?.last_name ?? 'Unknown',
      userId: ctx.from?.id ?? 'Unknown',
      messageId: ctx.message?.message_id ?? 'Unknown',
      messageText: messagePrompt,
    });

    const repliedContent = {
      type: 'text',
      text: `---\n## Replied message\n\n${repliedMsgText}${
        ctx.message.quote ? `\n\nUser quoted just this part:\n${ctx.message.quote.text}` : ''
      }`,
    };

    const originalMsgContent = {
      type: 'text',
      text: `${originMsgText}\n---\nThis message is a reply to the message with id ${ctx.message.reply_to_message.message_id}`,
    };

    ctx.prompt = new HumanMessage({
      content: [originalMsgContent, repliedContent],
    });
  }

  await runAgentAndReply();
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

async function getPhotoUrl(photo: PhotoSize | Document) {
  const logger = injectLogger();
  const env = injectEnv();
  const ctx = injectBotContext();

  const fileDescription = await ctx.api.getFile(photo.file_id);

  const telegramFileUrl = `${env.TELEGRAM_API_URL}/file/bot${env.BOT_TOKEN}/${fileDescription.file_path}`;

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
    `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/images/v1`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.CLOUDFLARE_IMAGE_API_TOKEN}`,
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
    logger.error('Failed to upload image to Cloudflare', { errors });
    trace.getActiveSpan()?.recordException(errors.join('. '));
    throw new Error(errors.join(', '));
  }

  if (!result.variants.length) {
    throw new Error('No variants found');
  }

  return new URL(result.variants[0]);
}
