import { MemoryStorage } from '@mtcute/core';
import { TelegramClient } from '@mtcute/node';

import { env } from '@revelio/env/server';

export async function createTDLib() {
  const tg = new TelegramClient({
    apiId: env.TELEGRAM_API_ID,
    apiHash: env.TELEGRAM_API_HASH,
    disableUpdates: true,
    storage: new MemoryStorage(),
  });

  await tg.start({ botToken: env.BOT_TOKEN });

  return tg;
}
