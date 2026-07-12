import type Stripe from "stripe";
import { NextResponse } from "next/server";

import { BILLING_PLANS } from "@/lib/billing/plans";
import { getStripe } from "@/lib/billing/stripe";
import { getSubscriptionPlan, syncSubscription } from "@/lib/billing/subscription";
import { grantCredits } from "@/lib/credits/grant";

export const runtime = "nodejs";

function subscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const details = invoice.parent?.subscription_details;
  if (invoice.parent?.type === "subscription_details" && details) {
    const subscription = details.subscription;
    return typeof subscription === "string" ? subscription : subscription.id;
  }

  const legacyInvoice = invoice as Stripe.Invoice & {
    subscription?: string | Stripe.Subscription | null;
  };
  const subscription = legacyInvoice.subscription;
  if (!subscription) return null;
  return typeof subscription === "string" ? subscription : subscription.id;
}

async function handlePaidInvoice(invoice: Stripe.Invoice) {
  const subscriptionId = subscriptionIdFromInvoice(invoice);
  if (!subscriptionId) return;

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const planKey = getSubscriptionPlan(subscription);
  const userId = subscription.metadata.userId;
  if (!planKey || !userId) {
    throw new Error(`Facture ${invoice.id} sans offre ou utilisateur valide.`);
  }

  await syncSubscription(subscription);
  await grantCredits({
    userId,
    amount: BILLING_PLANS[planKey].monthlyCredits,
    type: "subscription_grant",
    planKey,
    stripeInvoiceId: invoice.id,
    idempotencyKey: `subscription-grant:${invoice.id}`,
    metadata: { subscriptionId },
  });
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook Stripe non configuré." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      await request.text(),
      signature,
      webhookSecret,
    );
  } catch (error) {
    console.error("Signature webhook Stripe invalide", error);
    return NextResponse.json({ error: "Signature invalide." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "invoice.paid":
        await handlePaidInvoice(event.data.object);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(event.data.object);
        break;
      default:
        break;
    }
  } catch (error) {
    console.error(`Échec du traitement Stripe ${event.id}`, error);
    return NextResponse.json({ error: "Traitement du webhook impossible." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
