import { Middleware } from 'grammy';

import { BotContext } from '@revelio/bot-utils';
import { createToolMessages, generateAnswer, transcribe } from '@revelio/llm';

export function transcribeMiddleware(): Middleware<BotContext> {
  return async (ctx: BotContext, next) => {
    await ctx.replyWithChatAction('typing');

    const file =
      ctx.message?.voice ?? ctx.message?.audio ?? ctx.message?.video_note ?? ctx.message?.video;

    if (!file) {
      await next();
      return;
    }

    if (!ctx.chatId) {
      ctx.logger.error('No chatId found');
      await ctx.reply('Failed to transcribe audio');
      return;
    }

    if (file.file_size && file.file_size > 20 * 1024 * 1024) {
      await generateAnswer(ctx, {
        messages: [
          {
            role: 'user',
            content: 'Some audio file',
          },
          ...createToolMessages({
            toolName: 'transcribe',
            result: {
              error: `This audio file is too large to transcribe. Please try with a file that is less than 20 MB.`,
            },
          }),
        ],
      });
    }

    if (file.duration > 60) {
      await generateAnswer(ctx, {
        messages: [
          {
            role: 'user',
            content: 'Some audio file',
          },
          ...createToolMessages({
            toolName: 'transcribe',
            result: {
              error: `This audio file is too long to transcribe. Please try with a file that is less than 60 seconds long.`,
            },
          }),
        ],
      });

      return;
    }

    const fileDescription = await ctx.api.getFile(file.file_id);

    ctx.transcription = await transcribe(
      ctx,
      file.file_unique_id,
      await fetch(
        `${ctx.env.TELEGRAM_API_URL}/file/bot${ctx.env.BOT_TOKEN}/${fileDescription.file_path}`,
      ),
    );

    await next();
  };
}
