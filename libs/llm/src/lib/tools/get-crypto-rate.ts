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

async function md5(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('MD5', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
