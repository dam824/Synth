import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/billing/stripe";

export const runtime = "nodejs";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  const billingCustomer = await prisma.billingCustomer.findUnique({
    where: { userId: session.user.id },
  });
  if (!billingCustomer) {
    return NextResponse.json({ error: "Aucun abonnement à gérer." }, { status: 404 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const portal = await getStripe().billingPortal.sessions.create({
    customer: billingCustomer.stripeCustomerId,
    return_url: `${appUrl}/app`,
  });

  return NextResponse.json({ url: portal.url });
}
