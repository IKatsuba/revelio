import { CloudflareD1MessageHistory } from '@langchain/cloudflare';

import { injectBotContext } from '@revelio/bot-utils';
import { injectEnv } from '@revelio/env';

export function createMessageHistory() {
  const env = injectEnv();
  const ctx = injectBotContext();

  return new CloudflareD1MessageHistory({
    sessionId: ctx.chatId.toString(),
    database: env.revelioMessagesDB,
  });
}
