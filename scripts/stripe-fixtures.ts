import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
export const prisma = new PrismaClient();

const subscriptionPlans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    features: [
      '📝 Text messages: Up to 20 messages per day',
      '🎤 Voice message transcription: Up to 5 minutes per day',
      '⏰ Reminders: Create up to 3 reminders',
      '💾 Information storage: Save up to 5 requests in bot memory',
      '📜 Basic functions: Access to basic commands (/help, /usage, /reset, etc.)',
      '📊 Usage statistics: Limited',
    ],
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 499,
    features: [
      '📝 Text messages: Up to 100 messages per day',
      '🖼️ Image generation: Up to 10 images per month',
      '🎤 Voice message transcription: Up to 60 minutes per month',
      '🔊 Speech synthesis (TTS): Up to 10,000 characters per month',
      '⏰ Reminders: Create up to 20 reminders',
      '💾 Information storage: Save up to 50 requests in bot memory',
      '📊 Usage statistics: Full access',
      '📩 Priority support',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 999,
    features: [
      '📝 Text messages: Unlimited',
      '🖼️ Image generation: Up to 50 images per month',
      '🎤 Voice message transcription: Up to 300 minutes per month',
      '🔊 Speech synthesis (TTS): Up to 50,000 characters per month',
      '⏰ Reminders: No limits',
      '💾 Information storage: No limits',
      '📊 Usage statistics: Advanced analytics',
      '🚀 Access to new features: Early access',
      '📩 Priority support',
    ],
  },
];

async function main() {
  const products = await stripe.products.list({ limit: 100, active: true });

  for (const product of products.data) {
    await stripe.products.update(product.id, {
      active: false,
    });
    await sleep(3000);
  }

  await prisma.subscription.deleteMany();
  await prisma.price.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();

  await sleep(3000);

  for (const plan of subscriptionPlans) {
    const product = await stripe.products.create({
      name: plan.name,
      active: true,
      marketing_features: plan.features.map((name) => ({ name })),
    });

    await sleep(3000);

    await stripe.prices.create({
      unit_amount: plan.price,
      currency: 'usd',
      recurring: {
        interval: 'month',
      },
      product: product.id,
      lookup_key: plan.id,
    });

    await sleep(3000);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch(console.error);
