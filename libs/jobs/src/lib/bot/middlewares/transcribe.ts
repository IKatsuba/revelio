import { logger } from '@trigger.dev/sdk/v3';
import { Middleware } from 'grammy';
import { nanoid } from 'nanoid';

import { BotContext } from '@revelio/bot-utils';
import { generateAnswer, transcribe } from '@revelio/llm';

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

    await logger.trace('transcribeMiddleware', async () => {
      const tdlib = await logger.trace('createTDLib', () => createTDLib());

      const buffer = await logger.trace('tdlib.downloadAsBuffer', () =>
        tdlib.downloadAsBuffer(file.file_id),
      );

      const blob = new File([buffer], file.file_id, {
        type: ('mime_type' in file && file.mime_type) || 'audio/ogg',
      });

      ctx.transcription = await logger.trace('transcribe', () =>
        transcribe(ctx, file.file_unique_id, blob),
      );

      await tdlib.close();
    });

    await next();
  };
}
