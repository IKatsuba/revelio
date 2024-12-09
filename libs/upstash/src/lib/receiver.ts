import { Receiver } from '@upstash/qstash';

import { factoryProvider, inject, provide } from '@revelio/di';
import { injectEnv } from '@revelio/env';

function createReceiver() {
  const env = injectEnv();

  return new Receiver({
    currentSigningKey: env.QSTASH_CURRENT_SIGNING_KEY,
    nextSigningKey: env.QSTASH_NEXT_SIGNING_KEY,
  });
}

export function provideReceiver() {
  provide(Receiver, factoryProvider(createReceiver));
}

export function injectReceiver() {
  return inject(Receiver);
}
