import { callOpenAI } from "./providers/openai-provider";
import { callAnthropic } from "./providers/anthropic-provider";
import { callGemini } from "./providers/gemini-provider";
import type {
  ProviderCallOutput,
  ProviderName,
  ProviderResult,
} from "./types";

type ProviderCaller = (prompt: string) => Promise<ProviderCallOutput>;

// Exécute un fournisseur en mesurant la latence et en isolant les erreurs :
// un échec d'un fournisseur ne fait jamais planter l'ensemble.
async function runProvider(
  provider: ProviderName,
  caller: ProviderCaller,
  prompt: string,
): Promise<ProviderResult> {
  const start = Date.now();
  try {
    const { content, model } = await caller(prompt);
    return {
      provider,
      ok: true,
      content,
      model,
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    return {
      provider,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      latencyMs: Date.now() - start,
    };
  }
}

// Appelle les trois fournisseurs en parallèle et renvoie tous les résultats
// (réussis ou non) dans un ordre stable.
export async function orchestrate(prompt: string): Promise<ProviderResult[]> {
  return Promise.all([
    runProvider("openai", callOpenAI, prompt),
    runProvider("anthropic", callAnthropic, prompt),
    runProvider("gemini", callGemini, prompt),
  ]);
}
