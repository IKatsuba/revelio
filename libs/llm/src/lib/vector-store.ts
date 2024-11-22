import { Index } from '@upstash/vector/cloudflare';

import { factoryProvider, inject, provide } from '@revelio/di';
import { injectEnv } from '@revelio/env';

export function injectVectorStore() {
  return inject<Index>(Index);
}

export function provideVectorStore() {
  provide(
    Index,
    factoryProvider(() => Index.fromEnv(injectEnv())),
  );
}
