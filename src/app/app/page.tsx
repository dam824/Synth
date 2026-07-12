import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin/access";
import { SynthClient } from "@/components/synth-client";
import { BILLING_PLANS, isBillingPlanKey } from "@/lib/billing/plans";

function isDatabaseUnavailable(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const maybeError = error as { code?: string; message?: string };
  return (
    maybeError.code === "P1001" ||
    maybeError.message?.includes("Can't reach database server") === true
  );
}

// Interface principale, protégée par le middleware.
export default async function AppPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Historique minimal : les conversations récentes de l'utilisateur.
  const conversations = await prisma.conversation
    .findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: { id: true, title: true, updatedAt: true },
    })
    .catch((error: unknown) => {
      if (isDatabaseUnavailable(error)) return [];
      throw error;
    });

  // Affiche le lien admin uniquement aux comptes autorisés.
  const isAdmin = (await getAdminContext()) !== null;

  const [wallet, subscription, latestGrant] = await Promise.all([
    prisma.wallet.findUnique({ where: { userId: session.user.id } }),
    prisma.billingSubscription.findUnique({ where: { userId: session.user.id } }),
    prisma.creditLedger.findFirst({
      where: { userId: session.user.id, type: "subscription_grant" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const periodStart = latestGrant?.createdAt ?? new Date(0);
  const spentAggregate = await prisma.creditLedger.aggregate({
    where: {
      userId: session.user.id,
      createdAt: { gte: periodStart },
      amount: { lt: 0 },
    },
    _sum: { amount: true },
  });
  const planKey = subscription?.planKey;
  const plan = planKey && isBillingPlanKey(planKey) ? BILLING_PLANS[planKey] : null;
  const balance = wallet?.balance ?? 0;
  const monthlyAllowance = latestGrant?.amount ?? plan?.monthlyCredits ?? 0;
  const spentThisPeriod = Math.abs(spentAggregate._sum.amount ?? 0);

  return (
    <SynthClient
      userEmail={session.user.email ?? ""}
      isAdmin={isAdmin}
      creditUsage={{
        planLabel: plan?.label ?? "Découverte",
        balance,
        monthlyAllowance,
        spentThisPeriod,
        estimatedSyntheses: Math.floor(balance / 20),
      }}
      conversations={conversations.map((c) => ({
        id: c.id,
        title: c.title,
        updatedAt: c.updatedAt.toISOString(),
      }))}
    />
  );
}
