import { tool } from 'ai';
import { z } from 'zod';

export const getCryptoRate = tool({
  description: 'get the current rate of a cryptocurrency',
  parameters: z.object({
    currency: z.string().describe('the currency code'),
  }),
  execute: async ({ currency }, { abortSignal }) => {
    const response = await fetch(`https://api.cryptomus.com/v1/exchange-rate/${currency}/list`);

    return response.json();
  },
});
