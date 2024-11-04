import { createAISDKTools } from '@agentic/ai-sdk';
import { WeatherClient } from '@agentic/weather';

const weather = new WeatherClient();

export const weatherTools = createAISDKTools(weather);
