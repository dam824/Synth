import { NextResponse } from "next/server";

import { getAdminContext } from "@/lib/admin/access";
import { prisma } from "@/lib/prisma";

// Tableau de bord admin : compteurs globaux, sans aucun contenu de conversation.
export async function GET() {
  const admin = await getAdminContext();
  if (!admin) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [
    users,
    conversations,
    prompts,
    providerErrors,
    safetyEvents,
    activeSubscribers,
    walletTotals,
    spentThisMonth,
  ] =
    await Promise.all([
      prisma.user.count(),
      prisma.conversation.count(),
      prisma.prompt.count(),
      prisma.modelResponse.count({ where: { success: false } }),
      prisma.safetyLog.count({ where: { decision: { not: "ALLOW" } } }),
      prisma.billingSubscription.count({
        where: { status: { in: ["active", "trialing"] } },
      }),
      prisma.wallet.aggregate({
        _sum: { balance: true, lifetimePurchased: true },
      }),
      prisma.creditLedger.aggregate({
        where: {
          type: "capture",
          createdAt: { gte: monthStart },
        },
        _sum: { amount: true },
      }),
    ]);

  return NextResponse.json({
    users,
    conversations,
    prompts,
    providerErrors,
    safetyEvents,
    activeSubscribers,
    creditsAvailable: walletTotals._sum.balance ?? 0,
    creditsGranted: walletTotals._sum.lifetimePurchased ?? 0,
    creditsSpentThisMonth: Math.abs(spentThisMonth._sum.amount ?? 0),
  });
}
