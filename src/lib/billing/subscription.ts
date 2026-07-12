import type Stripe from "stripe";

import { getPlanFromPriceId, isBillingPlanKey } from "@/lib/billing/plans";
import { prisma } from "@/lib/prisma";

export function getSubscriptionPlan(subscription: Stripe.Subscription) {
  const metadataPlan = subscription.metadata.planKey;
  if (metadataPlan && isBillingPlanKey(metadataPlan)) return metadataPlan;

  const priceId = subscription.items.data[0]?.price.id;
  return priceId ? getPlanFromPriceId(priceId) : null;
}

export async function syncSubscription(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.userId;
  const planKey = getSubscriptionPlan(subscription);
  const item = subscription.items.data[0];
  const legacySubscription = subscription as Stripe.Subscription & {
    current_period_end?: number;
  };
  const currentPeriodEnd =
    item?.current_period_end ?? legacySubscription.current_period_end;

  if (!userId || !planKey || !item || !currentPeriodEnd) {
    throw new Error(`Métadonnées incomplètes pour l'abonnement ${subscription.id}.`);
  }

  return prisma.billingSubscription.upsert({
    where: { userId },
    create: {
      userId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: item.price.id,
      planKey,
      status: subscription.status,
      currentPeriodEnd: new Date(currentPeriodEnd * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
    update: {
      stripeSubscriptionId: subscription.id,
      stripePriceId: item.price.id,
      planKey,
      status: subscription.status,
      currentPeriodEnd: new Date(currentPeriodEnd * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });
}
