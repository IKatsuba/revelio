import { CloudflareD1MessageHistory } from '@langchain/cloudflare';

import { injectBotContext } from '@revelio/bot-utils';
import { factoryProvider, inject, provide } from '@revelio/di';
import { injectEnv } from '@revelio/env';

function createMessageHistory() {
  const env = injectEnv();
  const ctx = injectBotContext();

  return new CloudflareD1MessageHistory({
    sessionId: ctx.chatId.toString(),
    database: env.revelioMessagesDB,
  });
}

export function provideMessageHistory() {
  provide(CloudflareD1MessageHistory, factoryProvider(createMessageHistory));
}

export function injectMessageHistory() {
  return inject(CloudflareD1MessageHistory);
}
