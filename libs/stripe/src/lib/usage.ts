import { Context } from 'grammy';

import { prisma } from '@revelio/prisma/server';

import { stripe } from './stripe';

export async function addTokenUsage(
  ctx: Context,
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
  const customer = await prisma.customer.findFirst({
    where: { id: ctx.chatId },
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
  ctx: Context,
  {
    model,
    resolution,
  }: {
    model: string;
    resolution: string;
  },
) {
  const customer = await prisma.customer.findFirst({
    where: { id: ctx.chatId },
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
  ctx: Context,
  {
    model,
    minuteCount,
  }: {
    model: string;
    minuteCount: number;
  },
) {
  const customer = await prisma.customer.findFirst({
    where: { id: ctx.chatId },
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
  ctx: Context,
  {
    model,
    characterCount,
  }: {
    model: string;
    characterCount: number;
  },
) {
  const customer = await prisma.customer.findFirst({
    where: { id: ctx.chatId },
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
