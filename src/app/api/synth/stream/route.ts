import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { callOpenAI } from "@/lib/ai/providers/openai-provider";
import { callAnthropic } from "@/lib/ai/providers/anthropic-provider";
import { callGemini } from "@/lib/ai/providers/gemini-provider";
import { judge } from "@/lib/ai/judge";
import { buildConversationMemoryPrompt } from "@/lib/ai/conversation-memory";
import { writeStoredContent } from "@/lib/security/crypto";
import { rateLimit } from "@/lib/security/rate-limit";
import { precheckPrompt, postcheckAnswer } from "@/lib/safety/moderation";
import {
  DEFAULT_MODEL_ORDER,
  FAST_MODEL_ORDER,
  getModelChoice,
  isModelChoiceId,
  type ModelChoiceId,
} from "@/lib/ai/model-catalog";
import { resolveModelName } from "@/lib/ai/model-runtime";
import type {
  ProviderCallOutput,
  ProviderName,
  ProviderResult,
  ProviderSuccess,
  ReflectionMode,
  UserAttachment,
} from "@/lib/ai/types";

// Pipeline IA en streaming : émet chaque étape (NDJSON) au fil de l'eau pour
// alimenter la timeline « coulisses » côté client.
export const maxDuration = 60;

const PROVIDERS: {
  name: ProviderName;
  call: (
    prompt: string,
    signal: AbortSignal | undefined,
    model: string,
    attachments?: UserAttachment[],
  ) => Promise<ProviderCallOutput>;
}[] = [
  { name: "openai", call: callOpenAI },
  { name: "anthropic", call: callAnthropic },
  { name: "gemini", call: callGemini },
];

const PROVIDER_MAP = new Map(PROVIDERS.map((p) => [p.name, p]));
const MAX_ATTACHMENTS = 4;
const MAX_IMAGE_BASE64_CHARS = 6_500_000;
const MAX_DOC_BASE64_CHARS = 14_000_000;
const MAX_TEXT_CHARS = 200_000;
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const TEXT_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "image/svg+xml",
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
    const kind =
      raw.kind === "image" || raw.kind === "text" || raw.kind === "document"
        ? raw.kind
        : null;
    if (!kind || !data) return [];
    if (kind === "image") {
      if (!IMAGE_TYPES.has(mimeType) || data.length > MAX_IMAGE_BASE64_CHARS) {
        return [];
      }
      return [{ kind, name, mimeType, data }];
    }
    if (kind === "document") {
      if (mimeType !== "application/pdf" || data.length > MAX_DOC_BASE64_CHARS) {
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
    if (a.kind === "document") {
      return `[PDF joint : ${a.name}]`;
    }
    return `[Document joint : ${a.name}]\n${a.data.slice(0, MAX_TEXT_CHARS)}`;
  });
  return `${prompt}\n\nPièces jointes mémorisées :\n${blocks.join("\n\n")}`;
}

function buildSequentialPrompt(
  prompt: string,
  previous: ProviderSuccess[],
): string {
  if (previous.length === 0) return prompt;

  const context = previous
    .map(
      (r, index) =>
        `Réponse ${index + 1} (${r.provider}, modèle ${r.model}) :\n${r.content}`,
    )
    .join("\n\n---\n\n");

  return [
    "Question initiale :",
    prompt,
    "",
    "Réponses déjà obtenues :",
    context,
    "",
    "Ta tâche : apporte une réponse indépendante, critique les angles morts utiles, corrige les erreurs éventuelles et ajoute ce qui manque. Ne répète pas inutilement les réponses précédentes.",
  ].join("\n");
}

// Neutralise le contenu d'une piste fournisseur si le post-check le bloque.
function sanitizeProviderContent(content: string): string {
  const check = postcheckAnswer(content);
  if (check.decision === "BLOCK") {
    return (
      check.message ??
      "Cette piste a été retenue pour des raisons de sécurité."
    );
  }
  return content;
}

export async function POST(request: Request) {
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
  // Mode « Rapide » : on impose les modèles légers (vitesse). Mode « Profond » :
  // on respecte l'ordre choisi par l'utilisateur (ou le défaut qualité).
  const modelOrder =
    reflectionMode === "fast"
      ? FAST_MODEL_ORDER
      : normalizeModelOrder(body.modelOrder ?? body.providerOrder);
  const attachments = parseAttachments(body.attachments);
  const orderedModels = modelOrder.map((id) => {
    const choice = getModelChoice(id);
    return {
      id,
      provider: PROVIDER_MAP.get(choice.provider)!,
      model: resolveModelName(id),
    };
  });

  let conversation = requestedConversationId
    ? await prisma.conversation.findFirst({
        where: { id: requestedConversationId, userId },
      })
    : null;
  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: { userId, title: prompt.slice(0, 60) },
    });
  }
  const conversationId = conversation.id;

  // Safety — pré-vérification AVANT tout appel fournisseur et toute persistance.
  const pre = precheckPrompt(prompt);
  if (pre.decision !== "ALLOW") {
    await prisma.safetyLog.create({
      data: {
        userId,
        stage: "pre",
        decision: pre.decision,
        category: pre.category,
      },
    });
  }
  if (pre.decision === "BLOCK") {
    return NextResponse.json(
      { error: pre.message ?? "Demande non autorisée.", safety: "blocked" },
      { status: 422 },
    );
  }

  const memory = await prisma.prompt.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    include: { finalAnswer: true },
  });
  const memoryContext = buildConversationMemoryPrompt(prompt, memory);
  const executionPrompt = memoryContext.prompt;

  const promptRow = await prisma.prompt.create({
    data: {
      conversationId,
      ...writeStoredContent(buildStoredPromptContent(prompt, attachments)),
    },
  });

  const encoder = new TextEncoder();
  const signal = request.signal;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));

      try {
        send({
          type: "started",
          conversationId,
          reflectionMode,
          modelOrder,
          providerOrder: orderedModels.map((entry) => entry.provider.name),
          memory: {
            totalTurns: memoryContext.totalTurns,
            includedTurns: memoryContext.includedTurns,
            truncated: memoryContext.truncated,
            shouldSuggestNewConversation:
              memoryContext.shouldSuggestNewConversation,
          },
          attachments: attachments.map((a) => ({
            kind: a.kind,
            name: a.name,
            mimeType: a.mimeType,
          })),
        });

        // Lance les 3 fournisseurs ; émet un événement dès que chacun se termine.
        const runOne = async (
          entry: (typeof orderedModels)[number],
        ): Promise<ProviderResult> => {
          const p = entry.provider;
          const startedAt = Date.now();
          send({
            type: "provider_start",
            provider: p.name,
            modelId: entry.id,
            model: entry.model,
          });
          try {
            const raw = await p.call(
              executionPrompt,
              signal,
              entry.model,
              attachments,
            );
            // Post-check par fournisseur : la piste individuelle (« voir sa
            // piste ») ne doit pas exposer de contenu bloqué.
            const content = sanitizeProviderContent(raw.content);
            const model = raw.model;
            const latencyMs = Date.now() - startedAt;
            send({
              type: "provider_done",
              provider: p.name,
              modelId: entry.id,
              ok: true,
              model,
              latencyMs,
              content,
            });
            return {
              provider: p.name,
              ok: true,
              content,
              model,
              modelId: entry.id,
              latencyMs,
            };
          } catch (err) {
            const latencyMs = Date.now() - startedAt;
            const error = err instanceof Error ? err.message : String(err);
            send({
              type: "provider_done",
              provider: p.name,
              modelId: entry.id,
              model: entry.model,
              ok: false,
              error,
              latencyMs,
            });
            return {
              provider: p.name,
              ok: false,
              error,
              model: entry.model,
              modelId: entry.id,
              latencyMs,
            };
          }
        };

        const results: ProviderResult[] =
          reflectionMode === "deep"
            ? []
            : await Promise.all(orderedModels.map(runOne));

        if (reflectionMode === "deep") {
          for (const entry of orderedModels) {
            const p = entry.provider;
            const previous = results.filter((r): r is ProviderSuccess => r.ok);
            const nextPrompt = buildSequentialPrompt(executionPrompt, previous);
            const startedAt = Date.now();
            send({
              type: "provider_start",
              provider: p.name,
              modelId: entry.id,
              model: entry.model,
            });
            try {
              const raw = await p.call(
                nextPrompt,
                signal,
                entry.model,
                attachments,
              );
              const content = sanitizeProviderContent(raw.content);
              const model = raw.model;
              const latencyMs = Date.now() - startedAt;
              send({
                type: "provider_done",
                provider: p.name,
                modelId: entry.id,
                ok: true,
                model,
                latencyMs,
                content,
              });
              results.push({
                provider: p.name,
                ok: true,
                content,
                model,
                modelId: entry.id,
                latencyMs,
              });
            } catch (err) {
              const latencyMs = Date.now() - startedAt;
              const error = err instanceof Error ? err.message : String(err);
              send({
                type: "provider_done",
                provider: p.name,
                modelId: entry.id,
                model: entry.model,
                ok: false,
                error,
                latencyMs,
              });
              results.push({
                provider: p.name,
                ok: false,
                error,
                model: entry.model,
                modelId: entry.id,
                latencyMs,
              });
            }
          }
        }

        await prisma.modelResponse.createMany({
          data: results.map((r) => ({
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

        const successes = results.filter((r): r is ProviderSuccess => r.ok);

        if (successes.length === 0) {
          await prisma.usageLog.create({
            data: {
              userId,
              promptId: promptRow.id,
              providersAttempted: results.length,
              providersSucceeded: 0,
            },
          });
          send({
            type: "error",
            error:
              "Aucun fournisseur n'a pu répondre. Réessayez dans un instant.",
          });
          controller.close();
          return;
        }

        send({ type: "judging" });

        const final = await judge(executionPrompt, successes);

        // Safety — post-vérification AVANT diffusion / persistance du contenu.
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
            post.message ??
            "La réponse a été retenue pour des raisons de sécurité.";
          final.keyPoints = [];
          final.disagreements = [];
        }

        await prisma.finalAnswer.create({
          data: {
            promptId: promptRow.id,
            ...writeStoredContent(final.finalAnswer),
            confidence: final.confidence,
            disagreements: JSON.stringify(final.disagreements),
            usedProviders: JSON.stringify(final.usedProviders),
          },
        });
        await prisma.usageLog.create({
          data: {
            userId,
            promptId: promptRow.id,
            providersAttempted: results.length,
            providersSucceeded: successes.length,
            confidence: final.confidence,
          },
        });

        send({
          type: "final",
          conversationId,
          final,
          providers: results.map((r) => ({
            provider: r.provider,
            ok: r.ok,
            model: r.ok ? r.model : undefined,
            content: r.ok ? r.content : undefined,
            error: r.ok ? undefined : r.error,
            latencyMs: r.latencyMs,
          })),
        });
        controller.close();
      } catch (err) {
        try {
          send({
            type: "error",
            error: err instanceof Error ? err.message : "Erreur inattendue",
          });
        } catch {
          /* contrôleur déjà fermé */
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
