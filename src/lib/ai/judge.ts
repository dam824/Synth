import Anthropic from "@anthropic-ai/sdk";

import { extractJsonStringField } from "./judge-output";
import { JUDGE_SYSTEM_PROMPT, buildJudgeUserPrompt } from "./prompts";
import type {
  ConfidenceLevel,
  JudgeResult,
  ProviderSuccess,
} from "./types";

const JUDGE_MODEL =
  process.env.JUDGE_MODEL ?? process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8";
const JUDGE_MAX_TOKENS = Math.min(
  32_768,
  Math.max(4_096, Number(process.env.JUDGE_MAX_TOKENS) || 16_384),
);

// Confiance par défaut selon le nombre de réponses disponibles, utilisée comme
// repli si le Juge ne fournit pas de valeur exploitable.
function fallbackConfidence(count: number): ConfidenceLevel {
  if (count >= 3) return "high";
  if (count === 2) return "medium";
  return "low";
}

// Extrait le premier objet JSON d'une chaîne (le Juge peut parfois ajouter du texte).
function extractJson(raw: string): string {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("Aucun JSON détecté dans la réponse du Juge");
  }
  return raw.slice(start, end + 1);
}

// Synthétise les réponses réussies en une réponse finale unique.
// `results` ne doit jamais être vide (vérifié en amont par l'appelant).
export async function judge(
  originalPrompt: string,
  results: ProviderSuccess[],
): Promise<JudgeResult> {
  const usedProviders = results.map((r) => r.provider);
  const defaultConfidence = fallbackConfidence(results.length);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY manquante (requise pour le Juge)");
  }

  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: JUDGE_MODEL,
    max_tokens: JUDGE_MAX_TOKENS,
    system: JUDGE_SYSTEM_PROMPT,
    messages: [
      { role: "user", content: buildJudgeUserPrompt(originalPrompt, results) },
    ],
  });

  const raw = message.content
    .filter((block) => block.type === "text")
    .map((block) => (block as { text: string }).text)
    .join("\n")
    .trim();

  // Titre de repli : première phrase de la réponse, tronquée.
  function fallbackTitle(text: string): string {
    const firstSentence = text.split(/(?<=[.!?])\s/)[0] ?? text;
    return firstSentence.slice(0, 90).trim() || "Réponse";
  }

  // Tentative de parsing structuré ; repli gracieux sur le texte brut.
  try {
    const parsed = JSON.parse(extractJson(raw)) as Partial<JudgeResult>;
    const confidence: ConfidenceLevel =
      parsed.confidence === "high" ||
      parsed.confidence === "medium" ||
      parsed.confidence === "low"
        ? parsed.confidence
        : defaultConfidence;

    const finalAnswer =
      typeof parsed.finalAnswer === "string" && parsed.finalAnswer.trim()
        ? parsed.finalAnswer.trim()
        : raw;

    return {
      title:
        typeof parsed.title === "string" && parsed.title.trim()
          ? parsed.title.trim()
          : fallbackTitle(finalAnswer),
      finalAnswer,
      keyPoints: Array.isArray(parsed.keyPoints)
        ? parsed.keyPoints
            .filter((p): p is string => typeof p === "string")
            .slice(0, 4)
        : [],
      confidence,
      disagreements: Array.isArray(parsed.disagreements)
        ? parsed.disagreements.filter((d): d is string => typeof d === "string")
        : [],
      usedProviders,
    };
  } catch {
    const recoveredAnswer = extractJsonStringField(raw, "finalAnswer");
    const finalAnswer = recoveredAnswer
      ? `${recoveredAnswer}${
          message.stop_reason === "max_tokens"
            ? "\n\n_La réponse a été interrompue avant sa conclusion._"
            : ""
        }`
      : "La réponse structurée n'a pas pu être finalisée. Vous pouvez relancer la demande.";
    const recoveredTitle = extractJsonStringField(raw, "title");
    return {
      title: recoveredTitle ?? fallbackTitle(finalAnswer),
      finalAnswer,
      keyPoints: [],
      confidence: defaultConfidence,
      disagreements: [],
      usedProviders,
    };
  }
}
