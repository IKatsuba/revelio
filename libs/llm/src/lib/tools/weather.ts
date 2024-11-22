import { createAISDKTools } from '@agentic/ai-sdk';
import { WeatherClient } from '@agentic/weather';

import { injectEnv } from '@revelio/env';

export function weatherToolFactory() {
  const env = injectEnv();

  const weather = new WeatherClient({
    apiKey: env.WEATHER_API_KEY,
  });

  return createAISDKTools(weather);
}
