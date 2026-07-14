import { GoogleGenAI } from "@google/genai";

import { PROVIDER_SYSTEM_PROMPT } from "../prompts";
import type { ProviderCallOutput, UserAttachment } from "../types";

const DEFAULT_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

// Appelle Google Gemini et renvoie le texte produit.
export async function callGemini(
  prompt: string,
  // Le SDK Gemini ne gère pas l'AbortSignal ici ; paramètre accepté pour
  // garder une signature homogène avec les autres fournisseurs.
  _signal?: AbortSignal,
  model = DEFAULT_MODEL,
  attachments: UserAttachment[] = [],
): Promise<ProviderCallOutput> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY manquante");
  }

  const ai = new GoogleGenAI({ apiKey });

  const textAttachments = attachments.filter((a) => a.kind === "text");
  const mediaAttachments = attachments.filter(
    (a) => a.kind === "image" || a.kind === "document",
  );
  const textContext =
    textAttachments.length > 0
      ? `\n\nDocuments joints :\n${textAttachments
          .map((a) => `### ${a.name}\n${a.data}`)
          .join("\n\n")}`
      : "";
  const contents =
    mediaAttachments.length > 0
      ? [
          { text: `${prompt}${textContext}` },
          ...mediaAttachments.map((a) => ({
            inlineData: {
              mimeType: a.kind === "document" ? "application/pdf" : a.mimeType,
              data: a.data,
            },
          })),
        ]
      : `${prompt}${textContext}`;

  const response = await ai.models.generateContent({
    model,
    contents,
    config: {
      systemInstruction: PROVIDER_SYSTEM_PROMPT,
    },
  });

  const content = response.text?.trim();
  if (!content) {
    throw new Error("Réponse Gemini vide");
  }

  return { content, model };
}
