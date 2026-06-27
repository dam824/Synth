import OpenAI from "openai";

import { PROVIDER_SYSTEM_PROMPT } from "../prompts";
import type { ProviderCallOutput } from "../types";

const DEFAULT_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o";

// Appelle OpenAI et renvoie le texte produit. Lève une erreur explicite
// en cas de problème (clé manquante, réponse vide, erreur réseau).
export async function callOpenAI(prompt: string): Promise<ProviderCallOutput> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY manquante");
  }

  const client = new OpenAI({ apiKey });

  const completion = await client.chat.completions.create({
    model: DEFAULT_MODEL,
    messages: [
      { role: "system", content: PROVIDER_SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
  });

  const content = completion.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("Réponse OpenAI vide");
  }

  return { content, model: DEFAULT_MODEL };
}
