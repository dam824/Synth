import { NextResponse } from "next/server";

import { getAdminContext, recordAudit } from "@/lib/admin/access";
import { prisma } from "@/lib/prisma";

// Détail d'une conversation — MÉTADONNÉES UNIQUEMENT.
// Le contenu en clair n'est accessible que via le break-glass (audité).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminContext();
  if (!admin) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  const { id } = await params;

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { id: true, email: true } },
      prompts: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          createdAt: true,
          modelResponses: {
            select: {
              provider: true,
              model: true,
              success: true,
              error: true,
              latencyMs: true,
            },
          },
          finalAnswer: { select: { confidence: true } },
        },
      },
    },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  await recordAudit({
    admin,
    action: "VIEW_METADATA",
    targetUserId: conversation.user.id,
    conversationId: conversation.id,
    metadata: { scope: "conversation_detail" },
  });

  return NextResponse.json({
    id: conversation.id,
    title: conversation.title,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
    userId: conversation.user.id,
    userEmail: conversation.user.email,
    // Aucun contenu : uniquement la structure et les métadonnées techniques.
    prompts: conversation.prompts.map((p) => ({
      id: p.id,
      createdAt: p.createdAt.toISOString(),
      confidence: p.finalAnswer?.confidence ?? null,
      providers: p.modelResponses.map((m) => ({
        provider: m.provider,
        model: m.model,
        ok: m.success,
        error: m.error,
        latencyMs: m.latencyMs,
      })),
    })),
  });
}

// Suppression admin d'une conversation.
// Action sensible : elle doit toujours être auditée avant suppression.
export async function DELETE(
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
      title: true,
      _count: { select: { prompts: true } },
    },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  await recordAudit({
    admin,
    action: "DELETE_CONVERSATION",
    targetUserId: conversation.userId,
    conversationId: conversation.id,
    reason,
    metadata: {
      title: conversation.title,
      promptCount: conversation._count.prompts,
    },
  });

  await prisma.conversation.delete({ where: { id: conversation.id } });

  return NextResponse.json({ ok: true });
}
