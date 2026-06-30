import type { ProviderName } from "./types";

export type ModelChoiceId =
  | "gpt_55"
  | "gpt_54"
  | "gpt_54_mini"
  | "claude_opus_48"
  | "claude_sonnet_46"
  | "claude_haiku_45"
  | "gemini_31_flash_lite"
  | "gemini_35_flash"
  | "gemini_31_pro";

export interface ModelChoice {
  id: ModelChoiceId;
  provider: ProviderName;
  family: "GPT" | "Claude" | "Gemini";
  label: string;
  shortLabel: string;
  defaultModel: string;
  description: string;
}

export const MODEL_CHOICES: ModelChoice[] = [
  {
    id: "gpt_55",
    provider: "openai",
    family: "GPT",
    label: "GPT-5.5",
    shortLabel: "GPT-5.5",
    defaultModel: "gpt-5.5",
    description: "Le plus avancé",
  },
  {
    id: "gpt_54",
    provider: "openai",
    family: "GPT",
    label: "GPT-5.4",
    shortLabel: "GPT-5.4",
    defaultModel: "gpt-5.4",
    description: "Équilibre coût / qualité",
  },
  {
    id: "gpt_54_mini",
    provider: "openai",
    family: "GPT",
    label: "GPT-5.4 mini",
    shortLabel: "5.4 mini",
    defaultModel: "gpt-5.4-mini",
    description: "Plus léger",
  },
  {
    id: "claude_opus_48",
    provider: "anthropic",
    family: "Claude",
    label: "Opus 4.8",
    shortLabel: "Opus 4.8",
    defaultModel: "claude-opus-4-8",
    description: "Pour les tâches complexes",
  },
  {
    id: "claude_sonnet_46",
    provider: "anthropic",
    family: "Claude",
    label: "Sonnet 4.6",
    shortLabel: "Sonnet 4.6",
    defaultModel: "claude-sonnet-4-6",
    description: "Efficace au quotidien",
  },
  {
    id: "claude_haiku_45",
    provider: "anthropic",
    family: "Claude",
    label: "Haiku 4.5",
    shortLabel: "Haiku 4.5",
    defaultModel: "claude-haiku-4-5",
    description: "Rapide",
  },
  {
    id: "gemini_31_flash_lite",
    provider: "gemini",
    family: "Gemini",
    label: "3.1 Flash-Lite",
    shortLabel: "3.1 Lite",
    defaultModel: "gemini-3.1-flash-lite",
    description: "Réponses les plus rapides",
  },
  {
    id: "gemini_35_flash",
    provider: "gemini",
    family: "Gemini",
    label: "3.5 Flash",
    shortLabel: "3.5 Flash",
    defaultModel: "gemini-3.5-flash",
    description: "Aide polyvalente",
  },
  {
    id: "gemini_31_pro",
    provider: "gemini",
    family: "Gemini",
    label: "3.1 Pro",
    shortLabel: "3.1 Pro",
    defaultModel: "gemini-3.1-pro",
    description: "Codage et mathématiques avancés",
  },
];

export const DEFAULT_MODEL_ORDER: ModelChoiceId[] = [
  "claude_opus_48",
  "gpt_55",
  "gemini_35_flash",
];

export function isModelChoiceId(value: unknown): value is ModelChoiceId {
  return MODEL_CHOICES.some((model) => model.id === value);
}

export function getModelChoice(id: ModelChoiceId): ModelChoice {
  const choice = MODEL_CHOICES.find((model) => model.id === id);
  if (!choice) {
    throw new Error(`Modèle inconnu: ${id}`);
  }
  return choice;
}
