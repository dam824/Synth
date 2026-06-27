import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { orchestrate } from "@/lib/ai/orchestrator";
import { judge } from "@/lib/ai/judge";
import type { ProviderSuccess, SynthResponse } from "@/lib/ai/types";

// Le pipeline IA peut être long : on autorise jusqu'à 60s.
export const maxDuration = 60;

export async function POST(request: Request) {
  // 1. Authentification.
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const userId = session.user.id;

  // 2. Lecture et validation du prompt.
  let body: { prompt?: unknown; conversationId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return NextResponse.json({ error: "Le prompt est requis" }, { status: 400 });
  }
  const requestedConversationId =
    typeof body.conversationId === "string" ? body.conversationId : null;

  // 3. Conversation : on réutilise celle fournie (si elle appartient à l'utilisateur),
  //    sinon on en crée une nouvelle.
  let conversation = requestedConversationId
    ? await prisma.conversation.findFirst({
        where: { id: requestedConversationId, userId },
      })
    : null;

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        userId,
        title: prompt.slice(0, 60),
      },
    });
  }

  // 4. Sauvegarde du prompt.
  const promptRow = await prisma.prompt.create({
    data: {
      conversationId: conversation.id,
      content: prompt,
    },
  });

  // 5 & 6. Appels parallèles avec gestion d'erreur par fournisseur.
  const providerResults = await orchestrate(prompt);

  // 7. Persistance de chaque réponse modèle.
  await prisma.modelResponse.createMany({
    data: providerResults.map((r) => ({
      promptId: promptRow.id,
      provider: r.provider,
      model: r.ok ? r.model : null,
      content: r.ok ? r.content : null,
      success: r.ok,
      error: r.ok ? null : r.error,
      latencyMs: r.latencyMs,
    })),
  });

  const successes = providerResults.filter(
    (r): r is ProviderSuccess => r.ok,
  );

  // Cas : aucun fournisseur n'a répondu -> erreur propre.
  if (successes.length === 0) {
    await prisma.usageLog.create({
      data: {
        userId,
        promptId: promptRow.id,
        providersAttempted: providerResults.length,
        providersSucceeded: 0,
        confidence: null,
      },
    });

    return NextResponse.json(
      {
        error:
          "Aucun fournisseur IA n'a pu répondre. Réessayez dans un instant.",
        providers: providerResults.map((r) => ({
          provider: r.provider,
          ok: r.ok,
          error: r.ok ? undefined : r.error,
          latencyMs: r.latencyMs,
        })),
      },
      { status: 502 },
    );
  }

  // 8 & 9. Synthèse par le Juge.
  let final;
  try {
    final = await judge(prompt, successes);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? `Le Juge a échoué : ${err.message}`
            : "Le Juge a échoué.",
      },
      { status: 502 },
    );
  }

  // 10. Sauvegarde de la réponse finale.
  await prisma.finalAnswer.create({
    data: {
      promptId: promptRow.id,
      content: final.finalAnswer,
      confidence: final.confidence,
      disagreements: JSON.stringify(final.disagreements),
      usedProviders: JSON.stringify(final.usedProviders),
    },
  });

  // 11. Journal d'utilisation.
  await prisma.usageLog.create({
    data: {
      userId,
      promptId: promptRow.id,
      providersAttempted: providerResults.length,
      providersSucceeded: successes.length,
      confidence: final.confidence,
    },
  });

  // Rafraîchit le titre si la conversation vient d'être créée et est restée générique.
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { updatedAt: new Date() },
  });

  // 12. Réponse au frontend.
  const payload: SynthResponse = {
    conversationId: conversation.id,
    promptId: promptRow.id,
    final,
    providers: providerResults.map((r) => ({
      provider: r.provider,
      ok: r.ok,
      model: r.ok ? r.model : undefined,
      error: r.ok ? undefined : r.error,
      latencyMs: r.latencyMs,
    })),
  };

  return NextResponse.json(payload);
}
