import Anthropic from "@anthropic-ai/sdk";

import { PROVIDER_SYSTEM_PROMPT } from "../prompts";
import type { ProviderCallOutput } from "../types";

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8";

// Appelle Anthropic Claude et renvoie le texte produit.
export async function callAnthropic(prompt: string): Promise<ProviderCallOutput> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY manquante");
  }

  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 4096,
    system: PROVIDER_SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content
    .filter((block) => block.type === "text")
    .map((block) => (block as { text: string }).text)
    .join("\n")
    .trim();

  if (!content) {
    throw new Error("Réponse Anthropic vide");
  }

  return { content, model: DEFAULT_MODEL };
}
