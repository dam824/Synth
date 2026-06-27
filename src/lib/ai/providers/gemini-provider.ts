import { GoogleGenAI } from "@google/genai";

import { PROVIDER_SYSTEM_PROMPT } from "../prompts";
import type { ProviderCallOutput } from "../types";

const DEFAULT_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

// Appelle Google Gemini et renvoie le texte produit.
export async function callGemini(prompt: string): Promise<ProviderCallOutput> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY manquante");
  }

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: prompt,
    config: {
      systemInstruction: PROVIDER_SYSTEM_PROMPT,
    },
  });

  const content = response.text?.trim();
  if (!content) {
    throw new Error("Réponse Gemini vide");
  }

  return { content, model: DEFAULT_MODEL };
}
