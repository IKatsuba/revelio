import { api } from './api';
import { telegramify } from './telegramify';

function splitTextIntoChunks(text: string, chunkSize = 4096) {
  const chunks = [];

  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }

  return chunks;
}

export async function sendLongText(chatId: number | undefined, text: string) {
  if (!chatId) {
    return;
  }

  for (const chunk of splitTextIntoChunks(text)) {
    await api.sendMessage(chatId, telegramify(chunk), {
      parse_mode: 'MarkdownV2',
    });
  }
}
