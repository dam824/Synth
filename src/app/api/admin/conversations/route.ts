import { NextResponse } from "next/server";

import { getAdminContext, recordAudit } from "@/lib/admin/access";
import { prisma } from "@/lib/prisma";

// Liste des conversations — METADONNÉES UNIQUEMENT (aucun contenu en clair).
export async function GET(request: Request) {
  const admin = await getAdminContext();
  if (!admin) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const take = Math.min(Number(searchParams.get("take") ?? 50), 200);

  const conversations = await prisma.conversation.findMany({
    orderBy: { updatedAt: "desc" },
    take,
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { id: true, email: true, suspended: true } },
      _count: { select: { prompts: true } },
      prompts: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          modelResponses: {
            select: { provider: true, success: true, latencyMs: true },
          },
          finalAnswer: { select: { confidence: true } },
        },
      },
    },
  });

  await recordAudit({ admin, action: "VIEW_METADATA" });

  return NextResponse.json({
    conversations: conversations.map((c) => {
      const last = c.prompts[0];
      return {
        id: c.id,
        title: c.title,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        userId: c.user.id,
        userEmail: c.user.email,
        suspended: c.user.suspended,
        promptCount: c._count.prompts,
        providers: last?.modelResponses.map((m) => ({
          provider: m.provider,
          ok: m.success,
          latencyMs: m.latencyMs,
        })),
        confidence: last?.finalAnswer?.confidence ?? null,
      };
    }),
  });
}
