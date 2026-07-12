import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/billing/stripe";

export async function getOrCreateStripeCustomer(userId: string, email?: string | null) {
  const existing = await prisma.billingCustomer.findUnique({ where: { userId } });
  if (existing) return existing.stripeCustomerId;

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: email ?? undefined,
    metadata: { userId },
  });

  try {
    const created = await prisma.billingCustomer.create({
      data: { userId, stripeCustomerId: customer.id },
    });
    return created.stripeCustomerId;
  } catch (error) {
    const concurrent = await prisma.billingCustomer.findUnique({ where: { userId } });
    if (concurrent) return concurrent.stripeCustomerId;
    throw error;
  }
}
