import { convertToCoreMessages } from 'ai';
import { parseBlob } from 'music-metadata';

import { BotContext, sendLongText } from '@revelio/bot-utils';
import { env } from '@revelio/env/server';
import { generateTextFactory, transcribe } from '@revelio/llm/server';

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

  console.log('Transcribing audio');

  const fileData = await ctx.api.getFile(file.file_id);

  const fileResponse = await fetch(
    `https://api.telegram.org/file/bot${env.BOT_TOKEN}/${fileData.file_path}`,
  );

  const blob = await fileResponse.clone().blob();

  const metadata = await parseBlob(blob, { duration: true });

  if (!metadata.format.duration) {
    await ctx.reply('Failed to transcribe audio');
    return;
  }

  const text = await transcribe(fileResponse);

  ctx.session.messages.push(
    ...convertToCoreMessages([
      {
        role: 'user',
        content: text,
      },
    ]),
  );

  await ctx.replyWithChatAction('typing');

  const generateText = generateTextFactory({
    chatId: ctx.chatId,
    messageId: ctx.message.message_id,
    userId: ctx.from.id,
    plan: ctx.session.plan,
  });

  const response = await generateText(ctx.session.messages);

  ctx.session.messages = [...ctx.session.messages, ...response.response.messages].slice(
    -env.MAX_HISTORY_SIZE,
  );

  await sendLongText(ctx, response.text);
}
