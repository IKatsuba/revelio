import { Index } from '@upstash/vector/cloudflare';

import { factoryProvider, inject, provide } from '@revelio/di';
import { injectEnv } from '@revelio/env';

provide(
  Index,
  factoryProvider(() => {
    const env = injectEnv();

    return new Index({
      url: env.UPSTASH_VECTOR_REST_URL,
      token: env.UPSTASH_VECTOR_REST_TOKEN,
    });
  }),
);

export function injectVectorStore() {
  return inject<Index>(Index);
}
