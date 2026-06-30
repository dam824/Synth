import OpenAI from "openai";

import { PROVIDER_SYSTEM_PROMPT } from "../prompts";
import type { ProviderCallOutput, UserAttachment } from "../types";

const DEFAULT_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o";

// Appelle OpenAI et renvoie le texte produit. Lève une erreur explicite
// en cas de problème (clé manquante, réponse vide, erreur réseau).
export async function callOpenAI(
  prompt: string,
  signal?: AbortSignal,
  model = DEFAULT_MODEL,
  attachments: UserAttachment[] = [],
): Promise<ProviderCallOutput> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY manquante");
  }

  const client = new OpenAI({ apiKey });

  const textAttachments = attachments.filter((a) => a.kind === "text");
  const imageAttachments = attachments.filter((a) => a.kind === "image");
  const textContext =
    textAttachments.length > 0
      ? `\n\nDocuments joints :\n${textAttachments
          .map((a) => `### ${a.name}\n${a.data}`)
          .join("\n\n")}`
      : "";

  const userContent =
    imageAttachments.length > 0
      ? [
          { type: "text" as const, text: `${prompt}${textContext}` },
          ...imageAttachments.map((a) => ({
            type: "image_url" as const,
            image_url: {
              url: `data:${a.mimeType};base64,${a.data}`,
            },
          })),
        ]
      : `${prompt}${textContext}`;

  const completion = await client.chat.completions.create(
    {
      model,
      messages: [
        { role: "system", content: PROVIDER_SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
    },
    { signal },
  );

  const content = completion.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("Réponse OpenAI vide");
  }

  return { content, model };
}
