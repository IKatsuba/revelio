import { createAISDKTools } from '@agentic/ai-sdk';
import { WeatherClient } from '@agentic/weather';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { injectEnv } from '@revelio/env';

export function weatherToolFactory() {
  return tool(
    async ({ q }) => {
      const env = injectEnv();

      const weather = new WeatherClient({
        apiKey: env.WEATHER_API_KEY,
      });

      return weather.getCurrentWeather({ q });
    },
    {
      name: 'weather',
      description: 'Get the weather',
      schema: z.object({
        q: z
          .string()
          .describe(
            'Location to get the weather for. Can be a city name, zipcode, IP address, or lat/lng coordinates. Example: "London"',
          ),
      }),
    },
  );
}
