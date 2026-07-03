import { NextResponse } from "next/server";

import { getAdminContext, recordAudit } from "@/lib/admin/access";
import { prisma } from "@/lib/prisma";
import { readStoredContent } from "@/lib/security/crypto";

// Break-glass : révèle le contenu déchiffré d'une conversation.
// Exige une raison ; chaque accès crée une entrée d'audit (append-only).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminContext();
  if (!admin) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  const { id } = await params;

  let body: { reason?: unknown };
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (reason.length < 5) {
    return NextResponse.json(
      { error: "Une raison (≥ 5 caractères) est obligatoire." },
      { status: 400 },
    );
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      prompts: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          content: true,
          contentEncrypted: true,
          contentNonce: true,
          contentKeyVersion: true,
          createdAt: true,
          finalAnswer: {
            select: {
              content: true,
              contentEncrypted: true,
              contentNonce: true,
              contentKeyVersion: true,
            },
          },
        },
      },
    },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  // Audit AVANT de renvoyer le contenu : la révélation est tracée même si la
  // suite échoue.
  await recordAudit({
    admin,
    action: "BREAK_GLASS_VIEW_CONTENT",
    targetUserId: conversation.userId,
    conversationId: conversation.id,
    reason,
  });

  return NextResponse.json({
    id: conversation.id,
    prompts: conversation.prompts.map((p) => ({
      id: p.id,
      createdAt: p.createdAt.toISOString(),
      content: readStoredContent(p),
      finalAnswer: p.finalAnswer ? readStoredContent(p.finalAnswer) : null,
    })),
  });
}
