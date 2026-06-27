import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { callOpenAI } from "@/lib/ai/providers/openai-provider";
import { callAnthropic } from "@/lib/ai/providers/anthropic-provider";
import { callGemini } from "@/lib/ai/providers/gemini-provider";
import { judge } from "@/lib/ai/judge";
import type {
  ProviderCallOutput,
  ProviderName,
  ProviderResult,
  ProviderSuccess,
} from "@/lib/ai/types";

// Pipeline IA en streaming : émet chaque étape (NDJSON) au fil de l'eau pour
// alimenter la timeline « coulisses » côté client.
export const maxDuration = 60;

const PROVIDERS: {
  name: ProviderName;
  call: (prompt: string, signal?: AbortSignal) => Promise<ProviderCallOutput>;
}[] = [
  { name: "openai", call: callOpenAI },
  { name: "anthropic", call: callAnthropic },
  { name: "gemini", call: callGemini },
];

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const userId = session.user.id;

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

  const promptRow = await prisma.prompt.create({
    data: { conversationId, content: prompt },
  });

  const encoder = new TextEncoder();
  const signal = request.signal;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));

      try {
        send({ type: "started", conversationId });
        for (const p of PROVIDERS) send({ type: "provider_start", provider: p.name });

        // Lance les 3 fournisseurs ; émet un événement dès que chacun se termine.
        const runOne = async (p: (typeof PROVIDERS)[number]): Promise<ProviderResult> => {
          const startedAt = Date.now();
          try {
            const { content, model } = await p.call(prompt, signal);
            const latencyMs = Date.now() - startedAt;
            send({
              type: "provider_done",
              provider: p.name,
              ok: true,
              model,
              latencyMs,
              content,
            });
            return { provider: p.name, ok: true, content, model, latencyMs };
          } catch (err) {
            const latencyMs = Date.now() - startedAt;
            const error = err instanceof Error ? err.message : String(err);
            send({ type: "provider_done", provider: p.name, ok: false, error, latencyMs });
            return { provider: p.name, ok: false, error, latencyMs };
          }
        };

        const results = await Promise.all(PROVIDERS.map(runOne));

        await prisma.modelResponse.createMany({
          data: results.map((r) => ({
            promptId: promptRow.id,
            provider: r.provider,
            model: r.ok ? r.model : null,
            content: r.ok ? r.content : null,
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

        const final = await judge(prompt, successes);

        await prisma.finalAnswer.create({
          data: {
            promptId: promptRow.id,
            content: final.finalAnswer,
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
