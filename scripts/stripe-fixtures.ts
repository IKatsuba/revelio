import { PrismaClient } from '@prisma/client';
import { OpenAI } from 'openai';
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
export const prisma = new PrismaClient();

const textModeles: OpenAI.ChatModel[] = ['gpt-4o-mini'];
const textIOTypes = ['input', 'output'];
const imageModels: OpenAI.ImageModel[] = ['dall-e-2'];
const imageResolutions: Exclude<OpenAI.ImageGenerateParams['size'], null | undefined>[] = [
  '1024x1024',
];
const audioModels: OpenAI.AudioModel[] = ['whisper-1'];
const speechModels: Array<'tts-1'> = ['tts-1'];

const prices: Record<string, Stripe.PriceCreateParams.Tier[]> = {
  'gpt-4o-mini-output-tokens': [
    {
      unit_amount: 0,
      up_to: 1,
    },
    {
      flat_amount: 120,
      up_to: 1000000,
    },
    {
      unit_amount_decimal: '0.000112',
      up_to: 2500000,
    },
    {
      unit_amount_decimal: '0.000104',
      up_to: 6000000,
    },
    {
      unit_amount_decimal: '0.000096',
      up_to: 15000000,
    },
    {
      unit_amount_decimal: '0.000088',
      up_to: 'inf',
    },
  ],
  'gpt-4o-mini-input-tokens': [
    {
      unit_amount: 0,
      up_to: 1,
    },
    {
      flat_amount: 60,
      up_to: 2000000,
    },
    {
      unit_amount_decimal: '0.000028',
      up_to: 5000000,
    },
    {
      unit_amount_decimal: '0.000026',
      up_to: 12000000,
    },
    {
      unit_amount_decimal: '0.000024',
      up_to: 30000000,
    },
    {
      unit_amount_decimal: '0.000022',
      up_to: 'inf',
    },
  ],
  'dall-e-2-1024x1024-images': [
    {
      unit_amount: 4,
      up_to: 30,
    },
    {
      unit_amount_decimal: '3.7',
      up_to: 70,
    },
    {
      unit_amount_decimal: '3.4',
      up_to: 160,
    },
    {
      unit_amount_decimal: '3.1',
      up_to: 400,
    },
    {
      unit_amount_decimal: '2.8',
      up_to: 'inf',
    },
  ],
  'whisper-1-audio': [
    {
      unit_amount_decimal: '1.2',
      up_to: 100,
    },
    {
      unit_amount_decimal: '1.12',
      up_to: 250,
    },
    {
      unit_amount_decimal: '1.04',
      up_to: 600,
    },
    {
      unit_amount_decimal: '0.96',
      up_to: 1500,
    },
    {
      unit_amount_decimal: '0.88',
      up_to: 'inf',
    },
  ],
  'tts-1-speech': [
    {
      unit_amount_decimal: '0.003',
      up_to: 10000,
    },
    {
      unit_amount_decimal: '0.0028',
      up_to: 25000,
    },
    {
      unit_amount_decimal: '0.0026',
      up_to: 60000,
    },
    {
      unit_amount_decimal: '0.0024',
      up_to: 150000,
    },
    {
      unit_amount_decimal: '0.0022',
      up_to: 'inf',
    },
  ],
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const products = await stripe.products.list({ limit: 100, active: true });

  for (const price of products.data) {
    await stripe.products.update(price.id, {
      active: false,
    });

    await sleep(3000);
  }

  await prisma.subscriptionOnPrice.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.price.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();

  await sleep(3000);

  for (const textModel of textModeles) {
    for (const textIOType of textIOTypes) {
      const product = await stripe.products.create({
        metadata: {
          model: textModel,
          mode: textIOType,
          type: 'tokens',
        },
        name: `OpenAI ${textModel} ${textIOType} tokens`,
        tax_code: 'txcd_10000000',
        unit_label: 'tokens',
      });

      await sleep(3000);

      const meter =
        (await stripe.billing.meters
          .create({
            default_aggregation: {
              formula: 'sum',
            },
            display_name: `OpenAI ${textModel} ${textIOType} tokens meter`,
            event_name: `${product.metadata.model}-${product.metadata.mode}-${product.metadata.type}`,
          })
          .catch(console.error)) ??
        (await stripe.billing.meters
          .list({})
          .then((meters) =>
            meters.data.find(
              (m) =>
                m.event_name ===
                `${product.metadata.model}-${product.metadata.mode}-${product.metadata.type}`,
            ),
          ));

      if (!meter) {
        console.error(
          'No meter found for',
          product.metadata.model,
          product.metadata.mode,
          product.metadata.type,
        );
        process.exit(1);
      }

      await stripe.prices.create({
        metadata: {
          model: product.metadata.model,
          mode: product.metadata.mode,
          type: product.metadata.type,
        },
        billing_scheme: 'tiered',
        currency: 'usd',
        product: product.id,
        recurring: {
          interval: 'month',
          interval_count: 1,
          meter: meter.id,
          usage_type: 'metered',
        },
        tax_behavior: 'unspecified',
        tiers:
          prices[`${product.metadata.model}-${product.metadata.mode}-${product.metadata.type}`],
        tiers_mode: 'graduated',
      });

      await sleep(3000);
    }
  }

  for (const imageModel of imageModels) {
    for (const imageSize of imageResolutions) {
      const product = await stripe.products.create({
        metadata: {
          model: imageModel,
          resolution: imageSize,
          type: 'images',
        },
        name: `OpenAI ${imageModel} ${imageSize} images`,
        tax_code: 'txcd_10000000',
        unit_label: 'images',
      });

      await sleep(3000);

      const meter =
        (await stripe.billing.meters
          .create({
            default_aggregation: {
              formula: 'sum',
            },
            display_name: `OpenAI ${imageModel} ${imageSize} images meter`,
            event_name: `${product.metadata.model}-${product.metadata.resolution}-${product.metadata.type}`,
          })
          .catch(console.error)) ??
        (await stripe.billing.meters.list({})).data.find(
          (m) =>
            m.event_name ===
            `${product.metadata.model}-${product.metadata.resolution}-${product.metadata.type}`,
        );

      if (!meter) {
        console.error(
          'No meter found for',
          product.metadata.model,
          product.metadata.resolution,
          product.metadata.type,
        );
        process.exit(1);
      }

      await stripe.prices.create({
        metadata: {
          model: product.metadata.model,
          resolution: product.metadata.resolution,
          type: product.metadata.type,
        },
        billing_scheme: 'tiered',
        currency: 'usd',
        product: product.id,
        recurring: {
          interval: 'month',
          interval_count: 1,
          meter: meter.id,
          usage_type: 'metered',
        },
        tax_behavior: 'unspecified',
        tiers:
          prices[
            `${product.metadata.model}-${product.metadata.resolution}-${product.metadata.type}`
          ],
        tiers_mode: 'graduated',
      });

      await sleep(3000);
    }
  }

  for (const audioModel of audioModels) {
    const product = await stripe.products.create({
      metadata: {
        model: audioModel,
        type: 'audio',
      },
      name: `OpenAI ${audioModel} audio`,
      tax_code: 'txcd_10000000',
      unit_label: 'minutes',
    });

    await sleep(3000);

    const meter =
      (await stripe.billing.meters
        .create({
          default_aggregation: {
            formula: 'sum',
          },
          display_name: `OpenAI ${audioModel} audio meter`,
          event_name: `${product.metadata.model}-${product.metadata.type}`,
        })
        .catch(console.error)) ??
      (await stripe.billing.meters.list({})).data.find(
        (m) => m.event_name === `${product.metadata.model}-${product.metadata.type}`,
      );

    if (!meter) {
      console.error('No meter found for', product.metadata.model, product.metadata.type);
      continue;
    }

    await stripe.prices.create({
      metadata: {
        model: product.metadata.model,
        type: product.metadata.type,
      },
      billing_scheme: 'tiered',
      currency: 'usd',
      product: product.id,
      recurring: {
        interval: 'month',
        interval_count: 1,
        meter: meter.id,
        usage_type: 'metered',
      },
      tax_behavior: 'unspecified',
      tiers: prices[`${product.metadata.model}-${product.metadata.type}`],
      tiers_mode: 'graduated',
    });

    await sleep(3000);
  }

  for (const speechModel of speechModels) {
    const product = await stripe.products.create({
      metadata: {
        model: speechModel,
        type: 'speech',
      },
      name: `OpenAI ${speechModel} speech`,
      tax_code: 'txcd_10000000',
      unit_label: 'characters',
    });

    await sleep(3000);

    const meter =
      (await stripe.billing.meters
        .create({
          default_aggregation: {
            formula: 'sum',
          },
          display_name: `OpenAI ${speechModel} speech meter`,
          event_name: `${product.metadata.model}-${product.metadata.type}`,
        })
        .catch(console.error)) ??
      (await stripe.billing.meters.list({})).data.find(
        (m) => m.event_name === `${product.metadata.model}-${product.metadata.type}`,
      );

    if (!meter) {
      console.error('No meter found for', product.metadata.model, product.metadata.type);
      process.exit(1);
    }

    await stripe.prices.create({
      metadata: {
        model: product.metadata.model,
        type: product.metadata.type,
      },
      billing_scheme: 'tiered',
      currency: 'usd',
      product: product.id,
      recurring: {
        interval: 'month',
        interval_count: 1,
        meter: meter.id,
        usage_type: 'metered',
      },
      tax_behavior: 'unspecified',
      tiers: prices[`${product.metadata.model}-${product.metadata.type}`],
      tiers_mode: 'graduated',
    });

    await sleep(3000);
  }
}

main().catch(console.error);
