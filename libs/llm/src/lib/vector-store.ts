import { Index } from '@upstash/vector/cloudflare';

import { inject } from '@revelio/di';

export function injectVectorStore() {
  return inject<Index>(Index);
}
