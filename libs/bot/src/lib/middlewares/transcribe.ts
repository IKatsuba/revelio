import { Middleware } from 'grammy';
import { nanoid } from 'nanoid';

import { BotContext } from '@revelio/bot-utils';
import { generateAnswer, transcribe } from '@revelio/llm';

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
      console.log('No chatId found');
      await ctx.reply('Failed to transcribe audio');
      return;
    }

    if (file.file_size && file.file_size > 20 * 1024 * 1024) {
      const toolCallId = `tool_${nanoid()}`;

      await generateAnswer(ctx, {
        messages: [
          {
            role: 'user',
            content: 'Some audio file',
          },
          {
            role: 'assistant',
            content: [
              {
                type: 'tool-call',
                toolCallId,
                toolName: 'transcribe',
                args: {},
              },
            ],
          },
          {
            role: 'tool',
            content: [
              {
                type: 'tool-result',
                toolCallId,
                toolName: 'transcribe',
                result: {
                  error: `This audio file is too large to transcribe. Please try with a file that is less than 20 MB.`,
                },
              },
            ],
          },
        ],
      });
    }

    if (file.duration > 60) {
      const toolCallId = `tool_${nanoid()}`;

      await generateAnswer(ctx, {
        messages: [
          {
            role: 'user',
            content: 'Some audio file',
          },
          {
            role: 'assistant',
            content: [
              {
                type: 'tool-call',
                toolCallId,
                toolName: 'transcribe',
                args: {},
              },
            ],
          },
          {
            role: 'tool',
            content: [
              {
                type: 'tool-result',
                toolCallId,
                toolName: 'transcribe',
                result: {
                  error: `This audio file is too long to transcribe. Please try with a file that is less than 60 seconds long.`,
                },
              },
            ],
          },
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
