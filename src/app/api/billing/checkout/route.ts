import { NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  getStripePriceId,
  isBillingPlanKey,
} from "@/lib/billing/plans";
import { getOrCreateStripeCustomer } from "@/lib/billing/customer";
import { getStripe } from "@/lib/billing/stripe";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { planKey?: string } | null;
  if (!body?.planKey || !isBillingPlanKey(body.planKey)) {
    return NextResponse.json({ error: "Offre inconnue." }, { status: 400 });
  }

  try {
    const currentSubscription = await prisma.billingSubscription.findUnique({
      where: { userId: session.user.id },
    });
    if (
      currentSubscription &&
      ["active", "trialing", "past_due"].includes(currentSubscription.status)
    ) {
      return NextResponse.json(
        { error: "Un abonnement existe déjà. Gérez-le depuis votre compte." },
        { status: 409 },
      );
    }

    const stripe = getStripe();
    const customer = await getOrCreateStripeCustomer(
      session.user.id,
      session.user.email,
    );
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer,
      line_items: [{ price: getStripePriceId(body.planKey), quantity: 1 }],
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      automatic_tax: { enabled: process.env.STRIPE_AUTOMATIC_TAX_ENABLED === "true" },
      customer_update: { address: "auto", name: "auto" },
      metadata: { userId: session.user.id, planKey: body.planKey },
      subscription_data: {
        metadata: { userId: session.user.id, planKey: body.planKey },
      },
      success_url: `${appUrl}/tarifs?checkout=success`,
      cancel_url: `${appUrl}/tarifs?checkout=cancel`,
    });

    if (!checkout.url) throw new Error("Stripe n'a pas renvoyé d'URL Checkout.");
    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    console.error("Création Checkout Stripe impossible", error);
    return NextResponse.json(
      { error: "Le paiement ne peut pas être initialisé pour le moment." },
      { status: 500 },
    );
  }
}
