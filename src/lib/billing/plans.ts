export const BILLING_PLANS = {
  essentiel: {
    key: "essentiel",
    label: "Essentiel",
    monthlyCredits: 1200,
    priceEnv: "STRIPE_PRICE_ESSENTIEL",
  },
  pro: {
    key: "pro",
    label: "Pro",
    monthlyCredits: 3000,
    priceEnv: "STRIPE_PRICE_PRO",
  },
} as const;

export type BillingPlanKey = keyof typeof BILLING_PLANS;

export function isBillingPlanKey(value: string): value is BillingPlanKey {
  return value in BILLING_PLANS;
}

export function getStripePriceId(planKey: BillingPlanKey): string {
  const plan = BILLING_PLANS[planKey];
  const priceId = process.env[plan.priceEnv];

  if (!priceId) {
    throw new Error(`Configuration Stripe manquante : ${plan.priceEnv}`);
  }

  return priceId;
}

export function getPlanFromPriceId(priceId: string): BillingPlanKey | null {
  for (const plan of Object.values(BILLING_PLANS)) {
    if (process.env[plan.priceEnv] === priceId) return plan.key;
  }
  return null;
}
