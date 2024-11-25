import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { injectBotContext } from '@revelio/bot-utils';
import { injectVectorStore } from '@revelio/llm';

export function addToMemoryToolFactory() {
  const ctx = injectBotContext();
  return tool(
    async ({ value }) => {
      if (!ctx.chatId) {
        return 'No chatId found';
      }

      if (!ctx.message?.message_id) {
        return 'No message_id found';
      }

      const namespace = injectVectorStore().namespace(ctx.chatId.toString());

      return namespace.upsert({
        id: ctx.message.message_id,
        data: value,
        metadata: {
          value,
        },
      });
    },
    {
      name: 'addToMemory',
      description: 'add some data to semantically store. Add something to memory only if asked',
      schema: z.object({
        value: z.string().describe('the data to store'),
      }),
    },
  );
}

export function getFromMemoryToolFactory() {
  const ctx = injectBotContext();

  return tool(
    async ({ context }) => {
      if (!ctx.chatId) {
        return 'No chatId found';
      }

      const namespace = injectVectorStore().namespace(ctx.chatId.toString());

      const result = await namespace.query({
        data: context,
        includeMetadata: true,
        topK: 1,
      });

      return result.map((r) => r.metadata.value);
    },
    {
      name: 'getFromMemory',
      description:
        'get some data from semantically store. Try to get something from memory only if asked',
      schema: z.object({
        context: z.string().describe('the context to use when querying the store'),
      }),
    },
  );
}
