import { getModelChoice, type ModelChoiceId } from "./model-catalog";
import type { ProviderName } from "./types";

const MODEL_ENV: Record<ModelChoiceId, string | undefined> = {
  gpt_55: process.env.OPENAI_GPT_55_MODEL,
  gpt_54: process.env.OPENAI_GPT_54_MODEL,
  gpt_54_mini: process.env.OPENAI_GPT_54_MINI_MODEL,
  claude_opus_48: process.env.ANTHROPIC_OPUS_48_MODEL,
  claude_sonnet_46: process.env.ANTHROPIC_SONNET_46_MODEL,
  claude_haiku_45: process.env.ANTHROPIC_HAIKU_45_MODEL,
  gemini_31_flash_lite: process.env.GEMINI_31_FLASH_LITE_MODEL,
  gemini_35_flash: process.env.GEMINI_35_FLASH_MODEL,
  gemini_31_pro: process.env.GEMINI_31_PRO_MODEL,
};

const PROVIDER_MODEL_ENV: Record<ProviderName, string | undefined> = {
  openai: process.env.OPENAI_MODEL,
  anthropic: process.env.ANTHROPIC_MODEL,
  gemini: process.env.GEMINI_MODEL,
};

export function resolveModelName(id: ModelChoiceId): string {
  const choice = getModelChoice(id);
  return MODEL_ENV[id] ?? PROVIDER_MODEL_ENV[choice.provider] ?? choice.defaultModel;
}
