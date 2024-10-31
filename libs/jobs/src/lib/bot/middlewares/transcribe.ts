import { Middleware } from 'grammy';
import { parseBlob } from 'music-metadata';

import { BotContext } from '@revelio/bot-utils';
import { env } from '@revelio/env/server';
import { transcribe } from '@revelio/llm/server';

export function transcribeMiddleware(): Middleware {
  return async (ctx: BotContext, next) => {
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

    ctx.transcription = await transcribe(fileResponse);

    await next();
  };
}
