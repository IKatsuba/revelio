import Stripe from 'stripe';

export const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY_LIVE ?? process.env.STRIPE_SECRET_KEY ?? '',
  {
    appInfo: {
      name: 'Perfio',
      version: '0.0.0',
    },
    apiVersion: '2022-08-01',
  },
);

const relevantEvents = new Set([
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
]);

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature') as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return new Response('Webhook secret not found.', { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    console.log(`🔔  Webhook received: ${event.type}`);
  } catch (err: any) {
    console.log(`❌ Error message: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (!relevantEvents.has(event.type)) {
    console.log(`❌ Unsupported Stripe event type: ${event.type}`);

    return new Response(`Unsupported event type: ${event.type}`, {
      status: 400,
    });
  } else {
    console.log(`✅ Supported Stripe event type: ${event.type}`);
  }

  try {
    switch (event.type) {
      case 'customer.subscription.deleted': {
        break;
      }
      case 'customer.subscription.created': {
        break;
      }
      case 'customer.subscription.updated': {
        break;
      }
      default:
        throw new Error('Unhandled relevant event!');
    }
  } catch (error) {
    console.log(error);
    return new Response(
      'Webhook handler failed. View your Next.js function logs.',
      {
        status: 400,
      },
    );
  }

  return new Response(JSON.stringify({ received: true }));
}
