import { Middleware } from 'grammy';

import { createHumanMessage, runAgentAndReply } from '@revelio/agent';
import { BotContext } from '@revelio/bot-utils';
import { injectEnv } from '@revelio/env';
import { createToolMessages, transcribe } from '@revelio/llm';
import { injectLogger } from '@revelio/logger';

export function transcribeMiddleware(): Middleware<BotContext> {
  return async (ctx: BotContext, next) => {
    const logger = injectLogger();
    const env = injectEnv();

    await ctx.replyWithChatAction('typing');

    const file =
      ctx.message?.voice ?? ctx.message?.audio ?? ctx.message?.video_note ?? ctx.message?.video;

    if (!file) {
      await next();
      return;
    }

    if (!ctx.chatId) {
      logger.error('No chatId found');
      await ctx.reply('Failed to transcribe audio');
      return;
    }

    if (file.file_size && file.file_size > 20 * 1024 * 1024) {
      ctx.prompt = [
        await createHumanMessage('Some audio file'),
        ...createToolMessages({
          toolName: 'transcribe',
          result: {
            error: `This audio file is too large to transcribe. Please try with a file that is less than 20 MB.`,
          },
        }),
      ];

      await runAgentAndReply();

      return;
    }

    if (file.duration > 60) {
      ctx.prompt = [
        await createHumanMessage('Some audio file'),
        ...createToolMessages({
          toolName: 'transcribe',
          result: {
            error: `This audio file is too long to transcribe. Please try with a file that is less than 60 seconds long.`,
          },
        }),
      ];

      await runAgentAndReply();

      return;
    }

    const fileDescription = await ctx.api.getFile(file.file_id);

    ctx.transcription = await transcribe(
      file.file_unique_id,
      await fetch(`${env.TELEGRAM_API_URL}/file/bot${env.BOT_TOKEN}/${fileDescription.file_path}`),
    );

    await next();
  };
}
