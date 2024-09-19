import { OpenAI } from 'openai';
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

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
      flat_amount_decimal: '1.2',
      up_to: 1000000,
    },
    {
      unit_amount_decimal: '0.00000112',
      up_to: 2500000,
    },
    {
      unit_amount_decimal: '0.00000104',
      up_to: 6000000,
    },
    {
      unit_amount_decimal: '0.00000096',
      up_to: 15000000,
    },
    {
      unit_amount_decimal: '0.00000088',
      up_to: 'inf',
    },
  ],
  'gpt-4o-mini-input-tokens': [
    {
      flat_amount_decimal: '0.6',
      up_to: 2000000,
    },
    {
      unit_amount_decimal: '0.00000028',
      up_to: 5000000,
    },
    {
      unit_amount_decimal: '0.00000026',
      up_to: 12000000,
    },
    {
      unit_amount_decimal: '0.00000024',
      up_to: 30000000,
    },
    {
      unit_amount_decimal: '0.00000022',
      up_to: 'inf',
    },
  ],
  'dall-e-2-1024x1024-images': [
    {
      unit_amount_decimal: '0.040',
      up_to: 30,
    },
    {
      unit_amount_decimal: '0.037',
      up_to: 70,
    },
    {
      unit_amount_decimal: '0.034',
      up_to: 160,
    },
    {
      unit_amount_decimal: '0.031',
      up_to: 400,
    },
    {
      unit_amount_decimal: '0.028',
      up_to: 'inf',
    },
  ],
  'whisper-1-audio': [
    {
      unit_amount_decimal: '0.012',
      up_to: 100,
    },
    {
      unit_amount_decimal: '0.0112',
      up_to: 250,
    },
    {
      unit_amount_decimal: '0.0104',
      up_to: 600,
    },
    {
      unit_amount_decimal: '0.0096',
      up_to: 1500,
    },
    {
      unit_amount_decimal: '0.0088',
      up_to: 'inf',
    },
  ],
  'tts-1-speech': [
    {
      unit_amount_decimal: '0.3',
      up_to: 10000,
    },
    {
      unit_amount_decimal: '0.28',
      up_to: 25000,
    },
    {
      unit_amount_decimal: '0.26',
      up_to: 60000,
    },
    {
      unit_amount_decimal: '0.24',
      up_to: 150000,
    },
    {
      unit_amount_decimal: '0.22',
      up_to: 'inf',
    },
  ],
};

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

    const meter = await stripe.billing.meters.create({
      default_aggregation: {
        formula: 'sum',
      },
      display_name: `OpenAI ${textModel} ${textIOType} tokens meter`,
      event_name: `${product.metadata.model}-${product.metadata.mode}-${product.metadata.type}`,
    });

    await stripe.prices.create({
      metadata: {
        model: product.metadata.model,
        mode: product.metadata.mode,
        type: product.metadata.type,
      },
      billing_scheme: 'tiered',
      currency: 'usd',
      lookup_key: `${product.metadata.model}-${product.metadata.mode}-${product.metadata.type}`,
      product: product.id,
      recurring: {
        interval: 'month',
        interval_count: 1,
        meter: meter.id,
        usage_type: 'metered',
      },
      tax_behavior: 'unspecified',
      tiers: prices[`${product.metadata.model}-${product.metadata.mode}-${product.metadata.type}`],
      tiers_mode: 'graduated',
    });
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

    const meter = await stripe.billing.meters.create({
      default_aggregation: {
        formula: 'sum',
      },
      display_name: `OpenAI ${imageModel} ${imageSize} images meter`,
      event_name: `${product.metadata.model}-${product.metadata.resolution}-${product.metadata.type}`,
    });

    await stripe.prices.create({
      metadata: {
        model: product.metadata.model,
        resolution: product.metadata.resolution,
        type: product.metadata.type,
      },
      billing_scheme: 'tiered',
      currency: 'usd',
      lookup_key: `${product.metadata.model}-${product.metadata.resolution}-${product.metadata.type}`,
      product: product.id,
      recurring: {
        interval: 'month',
        interval_count: 1,
        meter: meter.id,
        usage_type: 'metered',
      },
      tax_behavior: 'unspecified',
      tiers:
        prices[`${product.metadata.model}-${product.metadata.resolution}-${product.metadata.type}`],
      tiers_mode: 'graduated',
    });
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

  const meter = await stripe.billing.meters.create({
    default_aggregation: {
      formula: 'sum',
    },
    display_name: `OpenAI ${audioModel} audio meter`,
    event_name: `${product.metadata.model}-${product.metadata.type}`,
  });

  await stripe.prices.create({
    metadata: {
      model: product.metadata.model,
      type: product.metadata.type,
    },
    billing_scheme: 'tiered',
    currency: 'usd',
    lookup_key: `${product.metadata.model}-${product.metadata.type}`,
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

  const meter = await stripe.billing.meters.create({
    default_aggregation: {
      formula: 'sum',
    },
    display_name: `OpenAI ${speechModel} speech meter`,
    event_name: `${product.metadata.model}-${product.metadata.type}`,
  });

  await stripe.prices.create({
    metadata: {
      model: product.metadata.model,
      type: product.metadata.type,
    },
    billing_scheme: 'tiered',
    currency: 'usd',
    lookup_key: `${product.metadata.model}-${product.metadata.type}`,
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
}
