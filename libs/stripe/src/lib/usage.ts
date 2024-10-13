import { prisma } from '@revelio/prisma/server';

import { stripe } from './stripe';

export async function addTokenUsage(
  chatId: number | undefined,
  {
    model,
    mode,
    tokenCount,
  }: {
    model: string;
    mode: 'input' | 'output';
    tokenCount: number;
  },
) {
  if (!chatId) {
    return;
  }

  const customer = await prisma.customer.findFirst({
    where: { id: chatId.toString() },
  });

  if (!customer) {
    return;
  }

  await stripe.billing.meterEvents.create({
    event_name: `${model}-${mode}-tokens`,
    payload: {
      stripe_customer_id: customer.stripeCustomerId,
      value: tokenCount.toString(),
    },
  });
}

export async function addImageUsage(
  chatId: number | undefined,
  {
    model,
    resolution,
  }: {
    model: string;
    resolution: string;
  },
) {
  if (!chatId) {
    return;
  }

  const customer = await prisma.customer.findFirst({
    where: { id: chatId.toString() },
  });

  if (!customer) {
    return;
  }

  await stripe.billing.meterEvents.create({
    event_name: `${model}-${resolution}-images`,
    payload: {
      stripe_customer_id: customer.stripeCustomerId,
      value: '1',
    },
  });
}

export async function addAudioUsage(
  chatId: number | undefined,
  {
    model,
    minuteCount,
  }: {
    model: string;
    minuteCount: number;
  },
) {
  if (!chatId) {
    return;
  }

  const customer = await prisma.customer.findFirst({
    where: { id: chatId.toString() },
  });

  if (!customer) {
    return;
  }

  await stripe.billing.meterEvents.create({
    event_name: `${model}-audio`,
    payload: {
      stripe_customer_id: customer.stripeCustomerId,
      value: minuteCount.toString(),
    },
  });
}

export async function addSpeechUsage(
  chatId: number | undefined,
  {
    model,
    characterCount,
  }: {
    model: string;
    characterCount: number;
  },
) {
  if (!chatId) {
    return;
  }

  const customer = await prisma.customer.findFirst({
    where: { id: chatId.toString() },
  });

  if (!customer) {
    return;
  }

  await stripe.billing.meterEvents.create({
    event_name: `${model}-speech`,
    payload: {
      stripe_customer_id: customer.stripeCustomerId,
      value: characterCount.toString(),
    },
  });
}
