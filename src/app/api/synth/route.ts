import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { orchestrate } from "@/lib/ai/orchestrator";
import { judge } from "@/lib/ai/judge";
import { buildConversationMemoryPrompt } from "@/lib/ai/conversation-memory";
import { writeStoredContent } from "@/lib/security/crypto";
import { rateLimit } from "@/lib/security/rate-limit";
import { precheckPrompt, postcheckAnswer } from "@/lib/safety/moderation";
import {
  DEFAULT_MODEL_ORDER,
  FAST_MODEL_ORDER,
  isModelChoiceId,
  type ModelChoiceId,
} from "@/lib/ai/model-catalog";
import type {
  ProviderSuccess,
  ReflectionMode,
  SynthResponse,
  UserAttachment,
} from "@/lib/ai/types";

// Le pipeline IA peut être long : on autorise jusqu'à 60s.
export const maxDuration = 60;
const MAX_ATTACHMENTS = 4;
const MAX_IMAGE_BASE64_CHARS = 6_500_000;
const MAX_TEXT_CHARS = 60_000;
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const TEXT_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
]);

function normalizeModelOrder(value: unknown): ModelChoiceId[] {
  const requested = Array.isArray(value)
    ? Array.from(new Set(value.filter(isModelChoiceId)))
    : [];
  const missing = DEFAULT_MODEL_ORDER.filter((p) => !requested.includes(p));
  return [...requested, ...missing];
}

function parseReflectionMode(value: unknown): ReflectionMode {
  return value === "deep" ? "deep" : "fast";
}

function parseAttachments(value: unknown): UserAttachment[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, MAX_ATTACHMENTS).flatMap((item): UserAttachment[] => {
    if (!item || typeof item !== "object") return [];
    const raw = item as Record<string, unknown>;
    const name =
      typeof raw.name === "string" && raw.name.trim()
        ? raw.name.trim().slice(0, 120)
        : "fichier";
    const mimeType = typeof raw.mimeType === "string" ? raw.mimeType : "";
    const data = typeof raw.data === "string" ? raw.data : "";
    const kind = raw.kind === "image" || raw.kind === "text" ? raw.kind : null;
    if (!kind || !data) return [];
    if (kind === "image") {
      if (!IMAGE_TYPES.has(mimeType) || data.length > MAX_IMAGE_BASE64_CHARS) {
        return [];
      }
      return [{ kind, name, mimeType, data }];
    }
    if (!TEXT_TYPES.has(mimeType) || data.length > MAX_TEXT_CHARS) return [];
    return [{ kind, name, mimeType, data }];
  });
}

function buildStoredPromptContent(prompt: string, attachments: UserAttachment[]): string {
  if (attachments.length === 0) return prompt;
  const blocks = attachments.map((a) => {
    if (a.kind === "image") {
      return `[Image jointe : ${a.name} (${a.mimeType})]`;
    }
    return `[Document texte joint : ${a.name}]\n${a.data.slice(0, MAX_TEXT_CHARS)}`;
  });
  return `${prompt}\n\nPièces jointes mémorisées :\n${blocks.join("\n\n")}`;
}

export async function POST(request: Request) {
  // 1. Authentification.
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const userId = session.user.id;

  // Compte suspendu : blocage propre avant tout traitement.
  const account = await prisma.user.findUnique({
    where: { id: userId },
    select: { suspended: true },
  });
  if (account?.suspended) {
    return NextResponse.json(
      { error: "Votre compte est suspendu. Contactez le support." },
      { status: 403 },
    );
  }

  // Anti-abus : limite le nombre de requêtes par utilisateur.
  const rl = rateLimit(`synth:${userId}`);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Trop de requêtes. Réessayez dans un instant." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  // 2. Lecture et validation du prompt.
  let body: {
    prompt?: unknown;
    conversationId?: unknown;
    reflectionMode?: unknown;
    modelOrder?: unknown;
    providerOrder?: unknown;
    attachments?: unknown;
  };
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
  const reflectionMode = parseReflectionMode(body.reflectionMode);
  // Mode « Rapide » : modèles légers imposés. « Profond » : ordre utilisateur.
  const modelOrder =
    reflectionMode === "fast"
      ? FAST_MODEL_ORDER
      : normalizeModelOrder(body.modelOrder ?? body.providerOrder);
  const attachments = parseAttachments(body.attachments);

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

  // Safety — pré-vérification avant tout appel fournisseur / persistance.
  const pre = precheckPrompt(prompt);
  if (pre.decision !== "ALLOW") {
    await prisma.safetyLog.create({
      data: { userId, stage: "pre", decision: pre.decision, category: pre.category },
    });
  }
  if (pre.decision === "BLOCK") {
    return NextResponse.json(
      { error: pre.message ?? "Demande non autorisée.", safety: "blocked" },
      { status: 422 },
    );
  }

  const memory = await prisma.prompt.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "desc" },
    include: { finalAnswer: true },
  });
  const memoryContext = buildConversationMemoryPrompt(prompt, memory);
  const executionPrompt = memoryContext.prompt;

  // 4. Sauvegarde du prompt (chiffré au repos si une clé est configurée).
  const promptRow = await prisma.prompt.create({
    data: {
      conversationId: conversation.id,
      ...writeStoredContent(buildStoredPromptContent(prompt, attachments)),
    },
  });

  // 5 & 6. Appels parallèles avec gestion d'erreur par fournisseur.
  const providerResults = await orchestrate(executionPrompt, {
    mode: reflectionMode,
    order: modelOrder,
    attachments,
  });

  // 7. Persistance de chaque réponse modèle.
  await prisma.modelResponse.createMany({
    data: providerResults.map((r) => ({
      promptId: promptRow.id,
      provider: r.provider,
      model: r.ok ? r.model : null,
      ...(r.ok
        ? writeStoredContent(r.content)
        : { content: null, contentEncrypted: null, contentNonce: null }),
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
    final = await judge(executionPrompt, successes);
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

  // Safety — post-vérification avant persistance / renvoi.
  const post = postcheckAnswer(final.finalAnswer);
  if (post.decision !== "ALLOW") {
    await prisma.safetyLog.create({
      data: {
        userId,
        promptId: promptRow.id,
        stage: "post",
        decision: post.decision,
        category: post.category,
      },
    });
  }
  if (post.decision === "BLOCK") {
    final.finalAnswer =
      post.message ?? "La réponse a été retenue pour des raisons de sécurité.";
    final.keyPoints = [];
    final.disagreements = [];
  }

  // 10. Sauvegarde de la réponse finale (chiffrée au repos si clé configurée).
  await prisma.finalAnswer.create({
    data: {
      promptId: promptRow.id,
      ...writeStoredContent(final.finalAnswer),
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
