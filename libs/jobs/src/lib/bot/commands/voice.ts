import { convertToCoreMessages } from 'ai';
import { parseBlob } from 'music-metadata';

import { api, BotContext, getSession, sendLongText } from '@revelio/bot-utils';
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

  const fileData = await api.getFile(file.file_id);

  const fileResponse = await fetch(
    `https://api.telegram.org/file/bot${env.BOT_TOKEN}/${fileData.file_path}`,
  );

  const blob = await fileResponse.clone().blob();

  const metadata = await parseBlob(blob, { duration: true });

  if (!metadata.format.duration) {
    await api.sendMessage(ctx.chatId, 'Failed to transcribe audio');
    return;
  }

  const text = await transcribe(fileResponse);

  const session = await getSession(ctx.chatId);

  session.messages.push(
    ...convertToCoreMessages([
      {
        role: 'user',
        content: text,
      },
    ]),
  );

  await api.sendChatAction(ctx.chatId, 'typing');

  const generateText = generateTextFactory({
    chatId: ctx.chatId,
    messageId: ctx.message.message_id,
    userId: ctx.from.id,
    plan: session.plan,
  });

  const response = await generateText(session.messages);

  session.messages = [...session.messages, ...response.responseMessages].slice(
    -env.MAX_HISTORY_SIZE,
  );

  await sendLongText(ctx.chatId, response.text);
}
