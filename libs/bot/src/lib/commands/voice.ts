import { convertToCoreMessages } from 'ai';
import { parseBlob } from 'music-metadata';

import { env } from '@revelio/env/server';
import { generateText, transcribe } from '@revelio/llm/server';
import { addAudioUsage, addTokenUsage } from '@revelio/stripe/server';

import { BotContext } from '../context';
import { sendLongText } from '../utils';

export async function voice(ctx: BotContext) {
  await ctx.replyWithChatAction('typing');

  const file =
    ctx.message?.voice ?? ctx.message?.audio ?? ctx.message?.video_note ?? ctx.message?.video;

  if (!file) {
    await ctx.reply('Failed to transcribe audio');
    return;
  }

  const fileData = await ctx.api.getFile(file!.file_id);

  await ctx.replyWithChatAction('upload_voice');

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

  await addAudioUsage(ctx, {
    model: 'whisper-1',
    minuteCount: Math.ceil(metadata.format.duration / 60),
  });

  const messages = [
    ...ctx.session.messages,
    ...convertToCoreMessages([
      {
        role: 'user',
        content: text,
      },
    ]),
  ];

  await ctx.replyWithChatAction('typing');

  const response = await generateText(messages);

  ctx.session.messages = [...messages, ...response.responseMessages].slice(-env.MAX_HISTORY_SIZE);

  await sendLongText(ctx, response.text);

  await addTokenUsage(ctx, {
    model: 'gpt-4o-mini',
    mode: 'output',
    tokenCount: response.usage.completionTokens,
  });

  await addTokenUsage(ctx, {
    model: 'gpt-4o-mini',
    mode: 'input',
    tokenCount: response.usage.promptTokens,
  });
}
