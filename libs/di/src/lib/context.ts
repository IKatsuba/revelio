import { Context } from 'hono';

import { createInjectionToken, inject, register } from './di';

export const HONO_CONTEXT = createInjectionToken<Context>();

export function injectHonoContext(): Context {
  return inject(HONO_CONTEXT);
}

export function configureHonoContext(c: Context): void {
  register(HONO_CONTEXT, c);
}
