import { tool } from 'ai';
import { z } from 'zod';

export const getCryptoRate = tool({
  description: 'get the current rate of a cryptocurrency',
  parameters: z.object({
    currency: z.string().describe('the currency code'),
  }),
  execute: async ({ currency }) => {
    const response = await fetch(`https://api.coindesk.com/v1/bpi/currentprice/${currency}.json`);
    return response.json();
  },
});
