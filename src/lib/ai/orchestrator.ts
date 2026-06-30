import { callOpenAI } from "./providers/openai-provider";
import { callAnthropic } from "./providers/anthropic-provider";
import { callGemini } from "./providers/gemini-provider";
import {
  DEFAULT_MODEL_ORDER,
  getModelChoice,
  type ModelChoiceId,
} from "./model-catalog";
import { resolveModelName } from "./model-runtime";
import type {
  ProviderCallOutput,
  ProviderName,
  ProviderResult,
  ProviderSuccess,
  ReflectionMode,
  UserAttachment,
} from "./types";

type ProviderCaller = (
  prompt: string,
  signal: AbortSignal | undefined,
  model: string,
  attachments?: UserAttachment[],
) => Promise<ProviderCallOutput>;
type ProviderEntry = { name: ProviderName; call: ProviderCaller };

const PROVIDERS: Record<ProviderName, ProviderEntry> = {
  openai: { name: "openai", call: callOpenAI },
  anthropic: { name: "anthropic", call: callAnthropic },
  gemini: { name: "gemini", call: callGemini },
};

// Exécute un fournisseur en mesurant la latence et en isolant les erreurs :
// un échec d'un fournisseur ne fait jamais planter l'ensemble.
async function runProvider(
  modelId: ModelChoiceId,
  caller: ProviderCaller,
  prompt: string,
  model: string,
  attachments: UserAttachment[] = [],
): Promise<ProviderResult> {
  const provider = getModelChoice(modelId).provider;
  const start = Date.now();
  try {
    const output = await caller(prompt, undefined, model, attachments);
    return {
      provider,
      ok: true,
      content: output.content,
      model: output.model,
      modelId,
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    return {
      provider,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      model,
      modelId,
      latencyMs: Date.now() - start,
    };
  }
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

function normalizeOrder(order?: ModelChoiceId[]): ModelChoiceId[] {
  const valid = new Set<ModelChoiceId>(DEFAULT_MODEL_ORDER);
  const normalized = Array.from(
    new Set((order ?? []).filter((p): p is ModelChoiceId => valid.has(p))),
  );
  const missing = DEFAULT_MODEL_ORDER.filter((p) => !normalized.includes(p));
  return [...normalized, ...missing];
}

export async function orchestrate(
  prompt: string,
  opts: {
    mode?: ReflectionMode;
    order?: ModelChoiceId[];
    attachments?: UserAttachment[];
  } = {},
): Promise<ProviderResult[]> {
  const order = normalizeOrder(opts.order);
  const models = order.map((id) => {
    const choice = getModelChoice(id);
    return {
      id,
      model: resolveModelName(id),
      provider: PROVIDERS[choice.provider],
    };
  });

  if (opts.mode !== "deep") {
    return Promise.all(
      models.map((entry) =>
        runProvider(
          entry.id,
          entry.provider.call,
          prompt,
          entry.model,
          opts.attachments ?? [],
        ),
      ),
    );
  }

  const results: ProviderResult[] = [];
  for (const entry of models) {
    const previous = results.filter((r): r is ProviderSuccess => r.ok);
    const nextPrompt = buildSequentialPrompt(prompt, previous);
    results.push(
      await runProvider(
        entry.id,
        entry.provider.call,
        nextPrompt,
        entry.model,
        opts.attachments ?? [],
      ),
    );
  }
  return results;
}
