import { createAISDKTools } from '@agentic/ai-sdk';
import { WeatherClient } from '@agentic/weather';

import { BotContext } from '@revelio/bot-utils';

export function weatherToolFactory(ctx: BotContext) {
  const weather = new WeatherClient({
    apiKey: ctx.env.WEATHER_API_KEY,
  });

  return createAISDKTools(weather);
}
