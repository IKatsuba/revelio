import * as process from 'node:process';

import { app } from './app';

export interface Env {
  API_HOST: string;
  HYPERDRIVE: Hyperdrive;
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
    Object.entries(env).forEach(([key, value]) => {
      process.env[key] = value;
    });

    return app.fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
