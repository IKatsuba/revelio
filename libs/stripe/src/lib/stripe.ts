import Stripe from 'stripe';

import { env } from '@revelio/env/server';

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2022-08-01',
  appInfo: {
    name: 'Revelio',
    version: '0.0.0',
  },
});
