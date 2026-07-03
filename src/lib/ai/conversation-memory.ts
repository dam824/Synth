import { readStoredContent } from "@/lib/security/crypto";

const DEFAULT_MEMORY_CHAR_BUDGET = 18000;
const DEFAULT_MEMORY_TURN_WARNING = 18;

// Forme des colonnes de contenu (clair legacy + chiffré).
interface StoredContentRow {
  content: string | null;
  contentEncrypted: string | null;
  contentNonce: string | null;
  contentKeyVersion: number;
}

export interface MemoryPrompt extends StoredContentRow {
  finalAnswer: StoredContentRow | null;
}

export interface ConversationMemory {
  prompt: string;
  totalTurns: number;
  includedTurns: number;
  truncated: boolean;
  shouldSuggestNewConversation: boolean;
}

function memoryCharBudget(): number {
  const raw = Number(process.env.CONVERSATION_MEMORY_CHAR_BUDGET);
  return Number.isFinite(raw) && raw > 2000 ? raw : DEFAULT_MEMORY_CHAR_BUDGET;
}

function warningTurnLimit(): number {
  const raw = Number(process.env.CONVERSATION_MEMORY_TURN_WARNING);
  return Number.isFinite(raw) && raw > 4 ? raw : DEFAULT_MEMORY_TURN_WARNING;
}

export function buildConversationMemoryPrompt(
  prompt: string,
  memory: MemoryPrompt[],
): ConversationMemory {
  if (memory.length === 0) {
    return {
      prompt,
      totalTurns: 0,
      includedTurns: 0,
      truncated: false,
      shouldSuggestNewConversation: false,
    };
  }

  const budget = memoryCharBudget();
  const chronological = [...memory].reverse();
  const selected: string[] = [];
  let used = 0;

  for (let i = chronological.length - 1; i >= 0; i -= 1) {
    const item = chronological[i];
    const question = readStoredContent(item).trim();
    const answer = item.finalAnswer
      ? readStoredContent(item.finalAnswer).trim()
      : "";
    const block = [
      `Échange précédent ${i + 1}`,
      `Utilisateur : ${question}`,
      answer ? `Réponse SYNTH : ${answer}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    if (used + block.length > budget) break;
    selected.unshift(block);
    used += block.length;
  }

  const truncated = selected.length < memory.length;
  const contextHeader = truncated
    ? "Contexte mémorisé de cette conversation (partie récente, conversation trop longue pour tout inclure) :"
    : "Contexte mémorisé de toute cette conversation :";

  return {
    prompt: [
      contextHeader,
      selected.join("\n\n---\n\n"),
      "",
      "Nouvelle demande utilisateur :",
      prompt,
    ].join("\n"),
    totalTurns: memory.length,
    includedTurns: selected.length,
    truncated,
    shouldSuggestNewConversation:
      truncated || memory.length >= warningTurnLimit(),
  };
}

