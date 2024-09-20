import Stripe from 'stripe';

import { env } from '@revelio/env/server';

export const stripe = new Stripe(env.STRIPE_SECRET_KEY);
