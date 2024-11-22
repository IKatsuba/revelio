import { BaselimeLogger } from '@baselime/edge-logger';
import { trace } from '@opentelemetry/api';

import { injectBotContext } from '@revelio/bot-utils';
import { classProvider, inject, injectHonoContext, provide } from '@revelio/di';
import { getEnv } from '@revelio/env';

export class WorkerLogger extends BaselimeLogger {
  constructor() {
    const c = injectHonoContext();

    super({
      ctx: c.executionCtx,
      apiKey: c.env.BASELIME_API_KEY,
      service: 'revelio',
      dataset: 'cloudflare',
      namespace: new URL(c.req.url).pathname,
      requestId: c.req.header('cf-ray'),
      isLocalDev: getEnv(c).NODE_ENV === 'development',
    });
  }

  get additionalFields() {
    try {
      const ctx = injectBotContext();

      return {
        user: ctx?.from?.id,
        username: ctx?.from?.username,
        chatId: ctx?.chatId,
      };
    } catch (e) {
      return {};
    }
  }

  log(msg: string, data?: Record<string, unknown>): void {
    super.log(msg, { ...this.additionalFields, ...(data ?? {}) });
  }

  info(msg: string, data?: Record<string, unknown>): void {
    super.info(msg, { ...this.additionalFields, ...(data ?? {}) });
  }

  warn(msg: string, data?: Record<string, unknown>): void {
    super.warn(msg, { ...this.additionalFields, ...(data ?? {}) });
  }

  error(msg: string | Error | unknown, data?: Record<string, unknown>): void {
    super.error(msg, { ...this.additionalFields, ...(data ?? {}) });
  }

  debug(msg: string, data?: Record<string, unknown>): void {
    super.debug(msg, { ...this.additionalFields, ...(data ?? {}) });
  }

  trace<T>(id: string, fn: () => Promise<T>): Promise<T> {
    return trace.getTracer('revelio').startActiveSpan(id, async (span) => {
      try {
        return await fn();
      } catch (e) {
        span.recordException(e);
      } finally {
        span.end();
      }
    });
  }
}

provide(WorkerLogger, classProvider(WorkerLogger));

export function injectLogger(): WorkerLogger {
  return inject(WorkerLogger);
}
