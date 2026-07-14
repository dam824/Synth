import Anthropic from "@anthropic-ai/sdk";

import { PROVIDER_SYSTEM_PROMPT } from "../prompts";
import type { ProviderCallOutput, UserAttachment } from "../types";

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8";

// Appelle Anthropic Claude et renvoie le texte produit.
export async function callAnthropic(
  prompt: string,
  signal?: AbortSignal,
  model = DEFAULT_MODEL,
  attachments: UserAttachment[] = [],
): Promise<ProviderCallOutput> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY manquante");
  }

  const client = new Anthropic({ apiKey });

  const textAttachments = attachments.filter((a) => a.kind === "text");
  const imageAttachments = attachments.filter((a) => a.kind === "image");
  const documentAttachments = attachments.filter((a) => a.kind === "document");
  const textContext =
    textAttachments.length > 0
      ? `\n\nDocuments joints :\n${textAttachments
          .map((a) => `### ${a.name}\n${a.data}`)
          .join("\n\n")}`
      : "";
  const hasMedia = imageAttachments.length > 0 || documentAttachments.length > 0;
  const userContent = hasMedia
    ? [
        { type: "text" as const, text: `${prompt}${textContext}` },
        ...imageAttachments.map((a) => ({
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: a.mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
            data: a.data,
          },
        })),
        ...documentAttachments.map((a) => ({
          type: "document" as const,
          title: a.name,
          source: {
            type: "base64" as const,
            media_type: "application/pdf" as const,
            data: a.data,
          },
        })),
      ]
    : `${prompt}${textContext}`;

  const message = await client.messages.create(
    {
      model,
      max_tokens: 4096,
      system: PROVIDER_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    } as Parameters<typeof client.messages.create>[0],
    { signal },
  );

  const blocks = (message as { content: Array<{ type: string; text?: string }> })
    .content;
  const responseContent = blocks
    .filter((block) => block.type === "text")
    .map((block) => block.text ?? "")
    .join("\n")
    .trim();

  if (!responseContent) {
    throw new Error("Réponse Anthropic vide");
  }

  return { content: responseContent, model };
}
