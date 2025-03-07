import { Client } from '@upstash/workflow';

import { factoryProvider, inject, provide } from '@revelio/di';
import { injectEnv } from '@revelio/env';

export function injectWorkflowClient() {
  return inject(Client);
}

function createWorkflowClient() {
  const env = injectEnv();

  return new Client({
    token: env.QSTASH_TOKEN,
  });
}

export function provideWorkflowClient() {
  provide(Client, factoryProvider(createWorkflowClient));
}
