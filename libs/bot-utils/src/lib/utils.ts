import { Context } from 'grammy';

import { BotContext } from './context';
import { telegramify } from './telegramify';

function splitTextIntoChunks(text: string, chunkSize = 4096) {
  const chunks = [];

  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }

  return chunks;
}

export async function sendLongText(
  ctx: BotContext,
  text: string,
  other?: Parameters<Context['reply']>[1],
) {
  if (!ctx.chatId) {
    return;
  }

  for (const chunk of splitTextIntoChunks(text)) {
    await ctx.reply(telegramify(chunk), {
      parse_mode: 'MarkdownV2',
      ...other,
    });
  }
}
