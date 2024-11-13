import { Index } from '@upstash/vector/cloudflare';

import { BotContext } from '@revelio/bot-utils';

export function createVectorStore(ctx: BotContext) {
  return new Index({
    url: ctx.env.UPSTASH_VECTOR_REST_URL,
    token: ctx.env.UPSTASH_VECTOR_REST_TOKEN,
  });
}
