import { CloudflareD1MessageHistory } from '@langchain/cloudflare';
import { BufferMemory } from 'langchain/memory';

import { injectEnv } from '@revelio/env';

export function prompt() {
  const env = injectEnv();

  const memory = new BufferMemory({
    returnMessages: true,
    chatHistory: new CloudflareD1MessageHistory({
      tableName: 'stored_message',
      sessionId: 'example',
      database: env.revelioMessagesDB,
    }),
  });
}
