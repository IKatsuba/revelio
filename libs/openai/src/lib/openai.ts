import { createOpenAI, OpenAIProvider } from '@ai-sdk/openai';
import OpenAI from 'openai';

import { createInjectionToken, factoryProvider, inject, provide } from '@revelio/di';
import { injectEnv } from '@revelio/env';

provide(
  OpenAI,
  factoryProvider(() => {
    const env = injectEnv();

    return new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      baseURL: env.OPENAI_API_URL,
    });
  }),
);

export function injectOpenAI(): OpenAI {
  return inject(OpenAI);
}

const OPENAI_API_PROVIDER = createInjectionToken<OpenAIProvider>();

provide(
  OPENAI_API_PROVIDER,
  factoryProvider(() => {
    const env = injectEnv();

    return createOpenAI({
      baseURL: env.OPENAI_API_URL,
      apiKey: env.OPENAI_API_KEY,
    });
  }),
);

export function injectOpenaiProvider() {
  return inject(OPENAI_API_PROVIDER);
}
