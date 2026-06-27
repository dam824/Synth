// Types partagés par la couche d'orchestration IA.

export type ProviderName = "openai" | "anthropic" | "gemini";

export type ConfidenceLevel = "high" | "medium" | "low";

// Réponse normalisée d'un fournisseur (succès).
export interface ProviderSuccess {
  provider: ProviderName;
  ok: true;
  content: string;
  model: string;
  latencyMs: number;
}

// Réponse normalisée d'un fournisseur (échec géré).
export interface ProviderFailure {
  provider: ProviderName;
  ok: false;
  error: string;
  latencyMs: number;
}

export type ProviderResult = ProviderSuccess | ProviderFailure;

// Sortie d'un appel fournisseur brut, avant normalisation.
export interface ProviderCallOutput {
  content: string;
  model: string;
}

// Résultat produit par le Juge.
export interface JudgeResult {
  // Titre court de la réponse (affiché en tête de l'AnswerCard).
  title: string;
  finalAnswer: string;
  // Points clés (2 à 4) extraits de la réponse.
  keyPoints: string[];
  confidence: ConfidenceLevel;
  // Désaccords/nuances exprimés en langage public (jamais de nom de fournisseur).
  disagreements: string[];
  usedProviders: ProviderName[];
}

// Réponse complète renvoyée au frontend par /api/synth.
export interface SynthResponse {
  conversationId: string;
  promptId: string;
  final: JudgeResult;
  providers: Array<{
    provider: ProviderName;
    ok: boolean;
    model?: string;
    error?: string;
    latencyMs: number;
  }>;
}
