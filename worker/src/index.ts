import * as process from 'node:process';
import { instrument } from '@microlabs/otel-cf-workers';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';
import { z } from 'zod';

import { envSchema } from '@revelio/env';

import { app } from './app';

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

export default instrument<z.infer<typeof envSchema>, unknown, unknown>(
  {
    async fetch(request, env, ctx): Promise<Response> {
      Object.entries(env).forEach(([key, value]) => {
        if (typeof value === 'string') {
          process.env[key] = value;
        }
      });

      return app.fetch(request, env, ctx);
    },
  },
  (_env, _trigger) => {
    const env = envSchema.parse(_env);

    return {
      exporter: env.BASELIME_API_KEY
        ? {
            url: 'https://otel.baselime.io/v1',
            headers: { 'x-api-key': env.BASELIME_API_KEY },
          }
        : new ConsoleSpanExporter(),
      service: { name: 'revelio' },
    };
  },
);
