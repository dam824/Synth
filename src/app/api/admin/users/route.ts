import { NextResponse } from "next/server";

import { getAdminContext } from "@/lib/admin/access";
import { prisma } from "@/lib/prisma";

// Liste des utilisateurs (métadonnées + compteurs, sans contenu).
export async function GET() {
  const admin = await getAdminContext();
  if (!admin) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      email: true,
      role: true,
      suspended: true,
      createdAt: true,
      wallet: {
        select: { balance: true, lifetimeSpent: true },
      },
      billingSubscription: {
        select: { planKey: true, status: true },
      },
      _count: { select: { conversations: true } },
    },
  });

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const monthlySpend = await prisma.creditLedger.groupBy({
    by: ["userId"],
    where: { type: "capture", createdAt: { gte: monthStart } },
    _sum: { amount: true },
  });
  const spendByUser = new Map(
    monthlySpend.map((entry) => [entry.userId, Math.abs(entry._sum.amount ?? 0)]),
  );

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      suspended: u.suspended,
      conversationCount: u._count.conversations,
      plan: u.billingSubscription?.planKey ?? "decouverte",
      subscriptionStatus: u.billingSubscription?.status ?? null,
      creditBalance: u.wallet?.balance ?? 0,
      creditsSpentThisMonth: spendByUser.get(u.id) ?? 0,
      lifetimeSpent: u.wallet?.lifetimeSpent ?? 0,
      createdAt: u.createdAt.toISOString(),
    })),
  });
}
