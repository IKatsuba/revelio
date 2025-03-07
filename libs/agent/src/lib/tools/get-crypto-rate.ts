import { tool } from '@langchain/core/tools';
import { z } from 'zod';

export const getCryptoRate = tool(
  async ({ currency }) => {
    const response = await fetch(`https://api.cryptomus.com/v1/exchange-rate/${currency}/list`);

    return response.json();
  },
  {
    name: 'getCryptoRate',
    description: 'get the current rate of a cryptocurrency',
    schema: z.object({
      currency: z.string().describe('the currency code'),
    }),
  },
);
