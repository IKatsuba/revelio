import { prismaExtension } from '@trigger.dev/build/extensions/prisma';
import { defineConfig } from '@trigger.dev/sdk/v3';

export default defineConfig({
  project: 'proj_xstwsidsvhoemwrosezu',
  runtime: 'node',
  logLevel: 'debug',
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  dirs: ['libs/jobs/src/lib'],
  build: {
    extensions: [
      prismaExtension({
        schema: 'prisma/schema.prisma',
        clientGenerator: 'client',
      }),
    ],
  },
});
