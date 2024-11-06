import { Middleware } from 'grammy';

import { BotContext } from '@revelio/bot-utils';
import { transcribe } from '@revelio/llm/server';

import { createTDLib } from '../tdlib';

export function transcribeMiddleware(): Middleware<BotContext> {
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

    const fileData = await ctx.api.getFile(file.file_id);

    const tdlib = await createTDLib();

    const buffer = await tdlib.downloadAsBuffer(file.file_id);

    const blob = new File([buffer], fileData.file_path ?? 'audio.ogg');

    ctx.transcription = await transcribe(blob);

    await tdlib.close();

    await next();
  };
}
