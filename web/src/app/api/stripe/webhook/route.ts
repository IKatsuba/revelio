import { Prisma } from '@prisma/client';
import Stripe from 'stripe';

import { bot, setSession } from '@revelio/bot/server';
import { env } from '@revelio/env/server';
import { prisma } from '@revelio/prisma/server';
import { stripe } from '@revelio/stripe/server';

const relevantEvents = new Set([
  'product.created',
  'product.updated',
  'product.deleted',
  'price.created',
  'price.updated',
  'price.deleted',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
]);

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature') as string;
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET;
  let event: Stripe.Event;

  try {
    if (!sig || !webhookSecret) return new Response('Webhook secret not found.', { status: 400 });
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    console.log(`🔔  Webhook received: ${event.type}`);
  } catch (err: any) {
    console.log(`❌ Error message: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (relevantEvents.has(event.type)) {
    try {
      switch (event.type) {
        case 'product.created':
        case 'product.updated':
          await upsertProductRecord(event.data.object as Stripe.Product);
          break;
        case 'price.created':
        case 'price.updated':
          await upsertPriceRecord(event.data.object as Stripe.Price);
          break;
        case 'price.deleted':
          await deletePriceRecord(event.data.object as Stripe.Price);
          break;
        case 'product.deleted':
          await deleteProductRecord(event.data.object as Stripe.Product);
          break;
        case 'customer.subscription.created': {
          const subscription = event.data.object as Stripe.Subscription;
          await manageSubscriptionStatusChange(
            subscription.id,
            subscription.customer as string,
            true,
          );
          break;
        }
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          await manageSubscriptionStatusChange(subscription.id, subscription.customer as string);
          break;
        }
        case 'checkout.session.completed': {
          // const checkoutSession = event.data.object as Stripe.Checkout.Session;
          // if (checkoutSession.mode === 'subscription') {
          //   const subscriptionId = checkoutSession.subscription;
          //   await manageSubscriptionStatusChange(
          //     subscriptionId as string,
          //     checkoutSession.customer as string,
          //   );
          // }
          break;
        }
        default:
          throw new Error('Unhandled relevant event!');
      }
    } catch (error) {
      console.log(error);
      return new Response('Webhook handler failed. View your Next.js function logs.', {
        status: 400,
      });
    }
  } else {
    return new Response(`Unsupported event type: ${event.type}`, {
      status: 400,
    });
  }
  return new Response(JSON.stringify({ received: true }));
}

async function upsertProductRecord(object: Stripe.Product) {
  try {
    await prisma.product.upsert({
      where: { id: object.id },
      update: {
        name: object.name,
        active: object.active,
        metadata: object.metadata,
      },
      create: {
        id: object.id,
        name: object.name,
        active: object.active,
        metadata: object.metadata,
      },
    });
    console.log(`Product ${object.id} upserted successfully.`);
  } catch (error) {
    console.error(`Failed to upsert product ${object.id}:`, error);
  }
}

async function upsertPriceRecord(object: Stripe.Price) {
  try {
    await prisma.price.upsert({
      where: { id: object.id },
      update: {
        active: object.active,
        currency: object.currency,
        unitAmount: object.unit_amount,
        type: object.type,
        interval: object.recurring?.interval,
        intervalCount: object.recurring?.interval_count,
        trialPeriodDays: object.recurring?.trial_period_days,
        product: {
          connect: {
            id: object.product as string,
          },
        },
        lookupKey: object.lookup_key,
        metadata: object.metadata,
      },
      create: {
        id: object.id,
        active: object.active,
        currency: object.currency,
        unitAmount: object.unit_amount,
        type: object.type,
        interval: object.recurring?.interval,
        intervalCount: object.recurring?.interval_count,
        trialPeriodDays: object.recurring?.trial_period_days,
        product: {
          connect: {
            id: object.product as string,
          },
        },
        lookupKey: object.lookup_key,
        metadata: object.metadata,
      },
    });
    console.log(`Price ${object.id} upserted successfully.`);
  } catch (error) {
    console.error(`Failed to upsert price ${object.id}:`, error);
  }
}

async function deletePriceRecord(object: Stripe.Price) {
  try {
    await prisma.price.delete({
      where: { id: object.id },
    });
    console.log(`Price ${object.id} deleted successfully.`);
  } catch (error) {
    console.error(`Failed to delete price ${object.id}:`, error);
  }
}

async function deleteProductRecord(object: Stripe.Product) {
  try {
    await prisma.product.delete({
      where: { id: object.id },
    });
    console.log(`Product ${object.id} deleted successfully.`);
  } catch (error) {
    console.error(`Failed to delete product ${object.id}:`, error);
  }
}

async function manageSubscriptionStatusChange(
  subscriptionId: string,
  customerId: string,
  isCreating = false,
) {
  const group = await prisma.group.findFirst({
    where: {
      customer: {
        stripeCustomerId: customerId,
      },
    },
  });

  if (!group) {
    throw new Error(`Customer lookup failed for`);
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['default_payment_method'],
  });
  // Upsert the latest status of the subscription object.
  const subscriptionData = Prisma.validator<Prisma.SubscriptionCreateInput>()({
    id: subscription.id,
    group: {
      connect: {
        id: group.id,
      },
    },
    status: subscription.status,
    subscriptionOnPrice: {
      connect: subscription.items.data.map((item) => ({
        subscriptionId_priceId: {
          priceId: item.price.id,
          subscriptionId: subscription.id,
        },
      })),
    },
    //TODO check quantity on subscription
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    quantity: subscription.quantity,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    cancelAt: subscription.cancel_at ? toDateTime(subscription.cancel_at).toISOString() : null,
    canceledAt: subscription.canceled_at
      ? toDateTime(subscription.canceled_at).toISOString()
      : null,
    currentPeriodStart: toDateTime(subscription.current_period_start).toISOString(),
    currentPeriodEnd: toDateTime(subscription.current_period_end).toISOString(),
    created: toDateTime(subscription.created).toISOString(),
    endedAt: subscription.ended_at ? toDateTime(subscription.ended_at).toISOString() : null,
    trialStart: subscription.trial_start
      ? toDateTime(subscription.trial_start).toISOString()
      : null,
    trialEnd: subscription.trial_end ? toDateTime(subscription.trial_end).toISOString() : null,
  });

  try {
    await prisma.subscription.upsert({
      where: { id: subscription.id },
      update: subscriptionData,
      create: subscriptionData,
    });

    await setSession(group.id, (session) => {
      session.plan = subscriptionData.status === 'active' ? 'pay-as-you-go' : undefined;
    });

    await bot.api.sendMessage(group.id, `Subscription status updated to ${subscription.status}`);
  } catch (e) {
    throw new Error(`Subscription insert/update failed: ${(e as Error).message}`);
  }

  console.log(`Inserted/updated subscription [${subscription.id}] for group [${group.id}]`);
}

function toDateTime(secs: number) {
  const t = new Date(+0);
  t.setSeconds(secs);
  return t;
}
