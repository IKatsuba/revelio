import { PrismaInstrumentation } from '@prisma/instrumentation';
import { OpenAIInstrumentation } from '@traceloop/instrumentation-openai';
import { syncEnvVars } from '@trigger.dev/build/extensions/core';
import { prismaExtension } from '@trigger.dev/build/extensions/prisma';
import { defineConfig } from '@trigger.dev/sdk/v3';

export default defineConfig({
  project: 'proj_xstwsidsvhoemwrosezu',
  runtime: 'node',
  logLevel: 'log',
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 1,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  dirs: ['libs/jobs/src/lib'],
  build: {
    extensions: [
      syncEnvVars(() => Object.entries(process.env).map(([name, value]) => ({ name, value }))),
      prismaExtension({
        schema: 'prisma/schema.prisma',
        clientGenerator: 'client',
      }),
    ],
  },
  instrumentations: [new PrismaInstrumentation(), new OpenAIInstrumentation()],
});
