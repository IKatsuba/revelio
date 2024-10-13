import { tool } from 'ai';
import { z } from 'zod';

import { index } from '../vector-store';

export function addToMemoryToolFactory({
  chatId,
  messageId,
}: {
  chatId: number;
  messageId: number;
}) {
  return tool({
    description: 'add some data to semantically store. Add something to memory only if asked',
    parameters: z.object({
      value: z.string().describe('the data to store'),
    }),
    execute: async ({ value }) => {
      const namespace = index.namespace(chatId.toString());

      return namespace.upsert({
        id: messageId,
        data: value,
        metadata: {
          value,
        },
      });
    },
  });
}

export function getFromMemoryToolFactory({ chatId }: { chatId: number }) {
  return tool({
    description:
      'get some data from semantically store. Try to get something from memory only if asked',
    parameters: z.object({
      context: z.string().describe('the context to use when querying the store'),
    }),
    execute: async ({ context }) => {
      const namespace = index.namespace(chatId.toString());

      return namespace.query({
        data: context,
        includeMetadata: true,
        topK: 1,
      });
    },
  });
}
