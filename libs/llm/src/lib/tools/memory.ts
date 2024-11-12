import { tool } from 'ai';
import { z } from 'zod';

import { BotContext } from '@revelio/bot-utils';

import { createVectorStore } from '../vector-store';

export function addToMemoryToolFactory(ctx: BotContext) {
  return tool({
    description: 'add some data to semantically store. Add something to memory only if asked',
    parameters: z.object({
      value: z.string().describe('the data to store'),
    }),
    execute: async ({ value }) => {
      if (!ctx.chatId) {
        return 'No chatId found';
      }

      if (!ctx.message?.message_id) {
        return 'No message_id found';
      }

      const namespace = createVectorStore(ctx).namespace(ctx.chatId.toString());

      return namespace.upsert({
        id: ctx.message.message_id,
        data: value,
        metadata: {
          value,
        },
      });
    },
  });
}

export function getFromMemoryToolFactory(ctx: BotContext) {
  return tool({
    description:
      'get some data from semantically store. Try to get something from memory only if asked',
    parameters: z.object({
      context: z.string().describe('the context to use when querying the store'),
    }),
    execute: async ({ context }) => {
      if (!ctx.chatId) {
        return 'No chatId found';
      }

      const namespace = createVectorStore(ctx).namespace(ctx.chatId.toString());

      return namespace.query({
        data: context,
        includeMetadata: true,
        topK: 1,
      });
    },
  });
}
