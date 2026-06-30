import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { ConfidenceLevel } from "@/lib/ai/types";

// Récupère le dernier échange (prompt + réponse finale + pistes) d'une
// conversation appartenant à l'utilisateur connecté.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;

  const conversation = await prisma.conversation.findFirst({
    where: { id, userId: session.user.id },
    include: {
      prompts: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { finalAnswer: true, modelResponses: true },
      },
    },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  const safeParse = (raw: string | null): string[] => {
    if (!raw) return [];
    try {
      const v = JSON.parse(raw);
      return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
    } catch {
      return [];
    }
  };

  const fallbackTitle = (text: string): string => {
    const first = text.split(/(?<=[.!?])\s/)[0] ?? text;
    return first.slice(0, 90).trim() || "Réponse";
  };

  const isPdfRefusal = (text: string): boolean => {
    const normalized = text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    return (
      /je ne peux pas generer/.test(normalized) &&
      /(fichier pdf|lien de telechargement|word|google docs|notion|canva)/.test(
        normalized,
      )
    );
  };

  const p =
    conversation.prompts.find(
      (prompt) =>
        prompt.finalAnswer && !isPdfRefusal(prompt.finalAnswer.content),
    ) ??
    conversation.prompts[0];

  return NextResponse.json({
    id: conversation.id,
    title: conversation.title,
    prompt: p
      ? {
          content: p.content,
          final: p.finalAnswer
            ? {
                title: fallbackTitle(p.finalAnswer.content),
                finalAnswer: p.finalAnswer.content,
                keyPoints: [] as string[],
                confidence: p.finalAnswer.confidence as ConfidenceLevel,
                disagreements: safeParse(p.finalAnswer.disagreements),
                usedProviders: safeParse(p.finalAnswer.usedProviders),
              }
            : null,
          providers: p.modelResponses.map((m) => ({
            provider: m.provider,
            ok: m.success,
            model: m.model ?? undefined,
            content: m.content ?? undefined,
            error: m.error ?? undefined,
            latencyMs: m.latencyMs ?? 0,
          })),
        }
      : null,
  });
}

// Met à jour une conversation : renommer, épingler, archiver, déplacer.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const { id } = await params;

  const owned = await prisma.conversation.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });
  if (!owned) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  let body: {
    title?: unknown;
    pinned?: unknown;
    archived?: unknown;
    projectId?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const data: {
    title?: string;
    pinned?: boolean;
    archived?: boolean;
    projectId?: string | null;
  } = {};

  if (typeof body.title === "string" && body.title.trim()) {
    data.title = body.title.trim().slice(0, 120);
  }
  if (typeof body.pinned === "boolean") data.pinned = body.pinned;
  if (typeof body.archived === "boolean") data.archived = body.archived;
  if (body.projectId === null || typeof body.projectId === "string") {
    // Vérifie que le projet cible appartient à l'utilisateur.
    if (typeof body.projectId === "string") {
      const project = await prisma.project.findFirst({
        where: { id: body.projectId, userId: session.user.id },
        select: { id: true },
      });
      if (!project) {
        return NextResponse.json(
          { error: "Projet introuvable" },
          { status: 400 },
        );
      }
    }
    data.projectId = body.projectId;
  }

  const updated = await prisma.conversation.update({
    where: { id },
    data,
    select: {
      id: true,
      title: true,
      pinned: true,
      archived: true,
      projectId: true,
    },
  });

  return NextResponse.json({ conversation: updated });
}

// Supprime une conversation (et ses prompts/réponses en cascade).
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const { id } = await params;

  const owned = await prisma.conversation.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });
  if (!owned) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  await prisma.conversation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
