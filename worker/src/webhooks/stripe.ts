import { NeonQueryFunction } from '@neondatabase/serverless';
import { Prisma } from '@prisma/client';
import { Api } from 'grammy';
import { Context } from 'hono';
import { Stripe } from 'stripe';

import { createBotApi, setSession } from '@revelio/bot-utils';
import { getEnv } from '@revelio/env';
import { createSQLClient } from '@revelio/prisma';
import { createStripe } from '@revelio/stripe';

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

export async function stripeWebhook(c: Context) {
  const stripe = createStripe(c);
  const botApi = createBotApi(c);

  const env = getEnv(c);
  const sql = createSQLClient(c);
  const body = await c.req.text();
  const sig = c.req.header('stripe-signature') as string;
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET;
  let event: Stripe.Event;

  try {
    if (!sig || !webhookSecret) {
      return new Response('Webhook secret not found.', { status: 400 });
    }
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
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
          await upsertProductRecord(sql, event.data.object as Stripe.Product);
          break;
        case 'price.created':
        case 'price.updated':
          await upsertPriceRecord(sql, event.data.object as Stripe.Price);
          break;
        case 'price.deleted':
          await deletePriceRecord(sql, event.data.object as Stripe.Price);
          break;
        case 'product.deleted':
          await deleteProductRecord(sql, event.data.object as Stripe.Product);
          break;
        case 'customer.subscription.created': {
          const subscription = event.data.object as Stripe.Subscription;
          await manageSubscriptionStatusChange(
            c,
            botApi,
            stripe,
            sql,
            subscription.id,
            subscription.customer as string,
            true,
          );
          break;
        }
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          await manageSubscriptionStatusChange(
            c,
            botApi,
            stripe,
            sql,
            subscription.id,
            subscription.customer as string,
          );
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

async function upsertProductRecord(sql: NeonQueryFunction<false, false>, object: Stripe.Product) {
  try {
    await sql`
      INSERT INTO "Product" (id, name, active, metadata)
      VALUES (${object.id}, ${object.name}, ${object.active}, ${object.metadata})
      ON CONFLICT (id) DO UPDATE
        SET name     = ${object.name},
            active   = ${object.active},
            metadata = ${object.metadata};
    `;

    console.log(`Product ${object.id} upserted successfully.`);
  } catch (error) {
    console.error(`Failed to upsert product ${object.id}:`, error);
  }
}

async function upsertPriceRecord(sql: NeonQueryFunction<false, false>, object: Stripe.Price) {
  try {
    await sql`
      INSERT INTO "Price" (id, active, currency, "unitAmount", type, interval, "intervalCount", "trialPeriodDays",
                           "lookupKey", metadata, "productId")
      VALUES (${object.id}, ${object.active}, ${object.currency}, ${object.unit_amount}, ${object.type},
              ${object.recurring?.interval}, ${object.recurring?.interval_count},
              ${object.recurring?.trial_period_days}, ${object.lookup_key}, ${object.metadata}, ${object.product})
      ON CONFLICT (id) DO UPDATE
        SET active            = ${object.active},
            currency          = ${object.currency},
            "unitAmount"      = ${object.unit_amount},
            type              = ${object.type},
            interval          = ${object.recurring?.interval},
            "intervalCount"   = ${object.recurring?.interval_count},
            "trialPeriodDays" = ${object.recurring?.trial_period_days},
            "lookupKey"       = ${object.lookup_key},
            metadata          = ${object.metadata},
            "productId"       = ${object.product};
    `;

    console.log(`Price ${object.id} upserted successfully.`);
  } catch (error) {
    console.error(`Failed to upsert price ${object.id}:`, error);
  }
}

async function deletePriceRecord(sql: NeonQueryFunction<false, false>, object: Stripe.Price) {
  try {
    await sql`
      DELETE
      FROM "Price"
      WHERE id = ${object.id};
    `;
    console.log(`Price ${object.id} deleted successfully.`);
  } catch (error) {
    console.error(`Failed to delete price ${object.id}:`, error);
  }
}

async function deleteProductRecord(sql: NeonQueryFunction<false, false>, object: Stripe.Product) {
  try {
    await sql`
      DELETE
      FROM "Product"
      WHERE id = ${object.id};
    `;
    console.log(`Product ${object.id} deleted successfully.`);
  } catch (error) {
    console.error(`Failed to delete product ${object.id}:`, error);
  }
}

async function manageSubscriptionStatusChange(
  c: Context,
  botApi: Api,
  stripe: Stripe,
  sql: NeonQueryFunction<false, false>,
  subscriptionId: string,
  customerId: string,
  isCreating = false,
) {
  const [group] = await sql`
    SELECT "Group".id
    FROM "Group"
           JOIN "Customer" ON "Group".id = "Customer"."id"
    WHERE "Customer"."stripeCustomerId" = ${customerId}
    LIMIT 1;
  `;

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
    price: {
      connect: {
        id: subscription.items.data[0].price.id,
      },
    },
  });

  try {
    const [dbSubscription] = await sql`
      INSERT INTO "Subscription" (id, status, quantity, "cancelAtPeriodEnd", "endedAt", "cancelAt", "canceledAt",
                                  "trialStart", "trialEnd", "groupId", "priceId")
      VALUES (${subscriptionData.id}, ${subscriptionData.status}, ${subscriptionData.quantity},
              ${subscriptionData.cancelAtPeriodEnd}, ${subscriptionData.endedAt},
              ${subscriptionData.cancelAt}, ${subscriptionData.canceledAt}, ${subscriptionData.trialStart},
              ${subscriptionData.trialEnd}, ${group.id}, ${subscriptionData.price.connect.id})
      ON CONFLICT (id) DO UPDATE
        SET status              = ${subscriptionData.status},
            quantity            = ${subscriptionData.quantity},
            "cancelAtPeriodEnd" = ${subscriptionData.cancelAtPeriodEnd},
            "endedAt"           = ${subscriptionData.endedAt},
            "cancelAt"          = ${subscriptionData.cancelAt},
            "canceledAt"        = ${subscriptionData.canceledAt},
            "trialStart"        = ${subscriptionData.trialStart},
            "trialEnd"          = ${subscriptionData.trialEnd},
            "groupId"           = ${group.id},
            "priceId"           = ${subscriptionData.price.connect.id}
      RETURNING *;
    `;

    await setSession(c, Number(group.id), (session) => {
      session.plan =
        subscriptionData.status === 'active'
          ? ((subscription.items.data[0].price.lookup_key as 'free' | 'basic' | 'premium') ??
            'free')
          : 'free';
    });

    await botApi.sendMessage(group.id, `Now you have a ${subscriptionData.status} subscription.`);
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
