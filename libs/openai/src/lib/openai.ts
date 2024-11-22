import { OpenAIProvider } from '@ai-sdk/openai';
import OpenAI from 'openai';

import { createInjectionToken, inject } from '@revelio/di';

export function injectOpenAI(): OpenAI {
  return inject(OpenAI);
}

export const OPENAI_API_PROVIDER = createInjectionToken<OpenAIProvider>();

export function injectOpenaiProvider() {
  return inject(OPENAI_API_PROVIDER);
}
