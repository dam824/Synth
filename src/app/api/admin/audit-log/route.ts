import { NextResponse } from "next/server";

import { getAdminContext } from "@/lib/admin/access";
import { prisma } from "@/lib/prisma";

// Journal d'audit admin (lecture). Visible uniquement par les admins.
export async function GET(request: Request) {
  const admin = await getAdminContext();
  if (!admin) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const take = Math.min(Number(searchParams.get("take") ?? 100), 300);

  const entries = await prisma.adminAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      adminEmail: true,
      action: true,
      targetUserId: true,
      conversationId: true,
      reason: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    entries: entries.map((e) => ({
      ...e,
      createdAt: e.createdAt.toISOString(),
    })),
  });
}
