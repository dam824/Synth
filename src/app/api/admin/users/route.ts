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
      _count: { select: { conversations: true } },
    },
  });

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      suspended: u.suspended,
      conversationCount: u._count.conversations,
      createdAt: u.createdAt.toISOString(),
    })),
  });
}
