import Stripe from 'stripe';

import { env } from '@revelio/env/server';

export const stripe = new Stripe(env.STRIPE_SECRET_KEY);

export function addTokenUsage({
  model,
  mode,
  tokenCount,
  customerId,
}: {
  model: string;
  mode: string;
  tokenCount: number;
  customerId: string;
}) {
  return stripe.billing.meterEvents.create({
    event_name: `${model}-${mode}-tokens`,
    payload: {
      stripe_customer_id: customerId,
      value: tokenCount.toString(),
    },
  });
}

export function addImageUsage({
  model,
  resolution,
  customerId,
}: {
  model: string;
  resolution: string;
  customerId: string;
}) {
  return stripe.billing.meterEvents.create({
    event_name: `${model}-${resolution}-images`,
    payload: {
      stripe_customer_id: customerId,
      value: '1',
    },
  });
}

export function addAudioUsage({
  model,
  customerId,
  minuteCount,
}: {
  model: string;
  customerId: string;
  minuteCount: number;
}) {
  return stripe.billing.meterEvents.create({
    event_name: `${model}-audio`,
    payload: {
      stripe_customer_id: customerId,
      value: minuteCount.toString(),
    },
  });
}

export function addSpeechUsage({
  model,
  customerId,
  characterCount,
}: {
  model: string;
  customerId: string;
  characterCount: number;
}) {
  return stripe.billing.meterEvents.create({
    event_name: `${model}-speech`,
    payload: {
      stripe_customer_id: customerId,
      value: characterCount.toString(),
    },
  });
}
