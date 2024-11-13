import { Context } from 'hono';
import Stripe from 'stripe';

import { getEnv } from '@revelio/env';

export function createStripe(c: Context) {
  const env = getEnv(c);

  return new Stripe(env.STRIPE_SECRET_KEY);
}
