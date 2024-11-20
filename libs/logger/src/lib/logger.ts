import { BaselimeLogger } from '@baselime/edge-logger';
import { trace } from '@opentelemetry/api';
import { Context as GrammyContext } from 'grammy';
import { Context } from 'hono';

import { getEnv } from '@revelio/env';

export class WorkerLogger extends BaselimeLogger {
  private readonly additionalFields: { chatId: number; user: number; username: string };

  constructor(c: Context, ctx?: GrammyContext) {
    super({
      ctx: c.executionCtx,
      apiKey: c.env.BASELIME_API_KEY,
      service: 'revelio',
      dataset: 'cloudflare',
      namespace: new URL(c.req.url).pathname,
      requestId: c.req.header('cf-ray'),
      isLocalDev: getEnv(c).NODE_ENV === 'development',
    });

    this.additionalFields = {
      user: ctx?.from?.id,
      username: ctx?.from?.username,
      chatId: ctx?.chatId,
    };
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

let _logger: WorkerLogger | null = null;

export function createLogger(c: Context, ctx?: GrammyContext): WorkerLogger {
  if (_logger) {
    return _logger;
  }

  _logger = new WorkerLogger(c, ctx);

  return _logger;
}
