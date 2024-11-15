import { context, diag, Span, trace } from '@opentelemetry/api';
import { Logger } from '@opentelemetry/api-logs';
import {
  OTLPExporterBase,
  OTLPExporterConfigBase,
  OTLPExporterError,
} from '@opentelemetry/otlp-exporter-base';
import { JsonLogsSerializer } from '@opentelemetry/otlp-transformer';
import {
  BatchLogRecordProcessor,
  LoggerProvider,
  type ReadableLogRecord,
} from '@opentelemetry/sdk-logs';
import { Context } from 'hono';

class LogExporter extends OTLPExporterBase<OTLPExporterConfigBase, ReadableLogRecord> {
  constructor(
    config: OTLPExporterConfigBase,
    private apiKey: string,
  ) {
    super(config);
  }

  onInit() {
    //
  }

  onShutdown() {
    //
  }

  send(
    items: ReadableLogRecord[],
    onSuccess: () => void,
    onError: (error: OTLPExporterError) => void,
  ): void {
    if (this._shutdownOnce.isCalled) {
      diag.debug('Shutdown already started. Cannot send objects');
      return;
    }
    const body = JsonLogsSerializer.serializeRequest(items as any) ?? new Uint8Array();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMillis);

    const promise = fetch(this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
      },
      body,
      signal: controller.signal,
    })
      .then(onSuccess, onError)
      .finally(() => clearTimeout(timeoutId));
    this._sendingPromises.push(promise);
    const popPromise = () => {
      const index = this._sendingPromises.indexOf(promise);
      this._sendingPromises.splice(index, 1);
    };
    promise.then(popPromise, popPromise);
  }

  getDefaultUrl(config: OTLPExporterConfigBase): string {
    return config.url;
  }
}

export class WorkerLogger {
  private readonly namespace: string;
  private readonly requestId: string;
  private readonly logger: Logger;

  constructor(
    private loggerProvider: LoggerProvider,
    request: Request,
  ) {
    this.namespace = new URL(request.url).pathname;
    this.requestId = request.headers.get('cf-ray');
    this.logger = loggerProvider.getLogger('default', '1.0.0');
  }

  private emit(severity: string, body: string, attrs?: Record<string, any>) {
    this.logger.emit({
      severityText: severity,
      body,
      attributes: {
        requestId: this.requestId,
        namespace: this.namespace,
        service: 'revelio',
        ...attrs,
      },
    });
  }

  debug(message: string, attributes?: Record<string, any>) {
    this.emit('debug', message, { ...attributes });
  }

  info(message: string, attributes?: Record<string, any>) {
    this.emit('info', message, { ...attributes });
  }

  warn(message: string, attributes?: Record<string, any>) {
    this.emit('warn', message, { ...attributes });
  }

  error(message: string, attributes?: Record<string, any>) {
    this.emit('error', null, { ...attributes });
  }

  fatal(message: string, attributes?: Record<string, any>) {
    this.emit('fatal', message, { ...attributes });
  }

  trace<T>(id: string, fn: (span: Span) => Promise<T>): Promise<T> {
    const tracer = trace.getTracer('revelio');

    return tracer.startActiveSpan(id, async (span) => {
      try {
        return await fn(span);
      } catch (e) {
        span.recordException(e);
      } finally {
        span.end();
      }
    });
  }

  flush(): Promise<void> {
    return this.loggerProvider.forceFlush();
  }
}

let _logger: WorkerLogger | null = null;

export function createLogger(c: Context) {
  if (_logger) {
    return _logger;
  }

  const collectorOptions = {
    url: 'https://otel.baselime.io/v1/logs',
  };
  const logExporter = new LogExporter(collectorOptions, c.env.BASELIME_API_KEY);
  const loggerProvider = new LoggerProvider();

  loggerProvider.addLogRecordProcessor(new BatchLogRecordProcessor(logExporter));

  _logger = new WorkerLogger(loggerProvider, c.req.raw);

  return _logger;
}
