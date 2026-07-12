import Stripe from "stripe";

import { SITE_CONFIG } from "@/config/site";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("Configuration Stripe manquante : STRIPE_SECRET_KEY");

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, {
      apiVersion: "2026-06-24.dahlia",
      appInfo: { name: SITE_CONFIG.name },
    });
  }

  return stripeClient;
}
