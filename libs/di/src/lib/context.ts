import { Context } from 'hono';

import { createInjectionToken, factoryProvider, inject, provide } from './di';

export const HONO_CONTEXT = createInjectionToken<Context>();

export function injectHonoContext(): Context {
  const c = inject(HONO_CONTEXT);

  if (!c) {
    throw new Error('Hono context not found');
  }

  return c;
}

export function provideHonoContext(c: Context): void {
  provide(
    HONO_CONTEXT,
    factoryProvider(() => c),
  );
}
