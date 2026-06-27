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
        take: 1,
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

  const p = conversation.prompts[0];

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
