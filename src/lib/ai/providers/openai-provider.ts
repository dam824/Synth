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
  const documentAttachments = attachments.filter((a) => a.kind === "document");
  const textContext =
    textAttachments.length > 0
      ? `\n\nDocuments joints :\n${textAttachments
          .map((a) => `### ${a.name}\n${a.data}`)
          .join("\n\n")}`
      : "";

  // Chat Completions n'accepte pas les PDF : dès qu'un document est joint, on
  // bascule sur la Responses API (input_file), qui gère texte + images + PDF.
  if (documentAttachments.length > 0) {
    const response = await client.responses.create(
      {
        model,
        instructions: PROVIDER_SYSTEM_PROMPT,
        input: [
          {
            role: "user",
            content: [
              { type: "input_text" as const, text: `${prompt}${textContext}` },
              ...imageAttachments.map((a) => ({
                type: "input_image" as const,
                image_url: `data:${a.mimeType};base64,${a.data}`,
                detail: "auto" as const,
              })),
              ...documentAttachments.map((a) => ({
                type: "input_file" as const,
                filename: a.name,
                file_data: `data:application/pdf;base64,${a.data}`,
              })),
            ],
          },
        ],
      } as Parameters<typeof client.responses.create>[0],
      { signal },
    );

    const content = (response as { output_text?: string }).output_text?.trim();
    if (!content) {
      throw new Error("Réponse OpenAI vide");
    }
    return { content, model };
  }

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
