// Couche de modération propre au produit (en complément des garde-fous des
// fournisseurs). Fonctions pures, sans accès base ni réseau : on décide d'une
// action à partir du texte. Le stockage (SafetyLog) est fait par l'appelant.
//
// MVP volontairement simple et conservateur : détection par motifs. À enrichir
// plus tard (classifieur dédié), mais l'interface reste stable.

export type SafetyDecision = "ALLOW" | "WARN" | "BLOCK" | "ESCALATE";
export type SafetyStage = "pre" | "post";

export interface SafetyResult {
  decision: SafetyDecision;
  category: string | null;
  // Message destiné à l'utilisateur si WARN/BLOCK (jamais le détail technique).
  message: string | null;
}

const ALLOW: SafetyResult = { decision: "ALLOW", category: null, message: null };

// Catégories à bloquer (instructions opérationnelles dangereuses).
const BLOCK_PATTERNS: { category: string; re: RegExp }[] = [
  {
    category: "weapons_explosives",
    re: /\b(fabriquer|construire|faire)\b.{0,40}\b(bombe|explosif|nitroglyc|tnt|détonateur|detonateur)\b/i,
  },
  {
    category: "weapons_bio_chem",
    re: /\b(synthétiser|synthetiser|fabriquer|produire)\b.{0,40}\b(agent neurotoxique|gaz (sarin|moutarde)|arme biologique|anthrax|ricine)\b/i,
  },
  {
    category: "csae",
    re: /\b(mineur|enfant|adolescent)\b.{0,40}\b(sexuel|nu|pornograph)/i,
  },
  {
    category: "cyber_abuse",
    re: /\b(ransomware|keylogger|cheval de troie|rat malware)\b.{0,40}\b(coder|écrire|ecrire|développer|developper|créer|creer)\b|\b(coder|écrire|ecrire|développer|developper|créer|creer)\b.{0,40}\b(ransomware|keylogger|malware indétectable|malware indetectable)\b/i,
  },
  {
    category: "fraud",
    re: /\b(carte (bancaire|de crédit|de credit) volée|carte (bancaire|de crédit|de credit) volee|fabriquer.{0,20}faux (billets|papiers)|blanchiment d'argent)\b/i,
  },
];

// Catégories qui déclenchent une escalade (à surveiller humainement).
const ESCALATE_PATTERNS: { category: string; re: RegExp }[] = [
  {
    category: "self_harm",
    re: /\b(me suicider|suicide|me faire du mal|en finir avec la vie|comment mourir)\b/i,
  },
];

// Catégories à accompagner d'un avertissement, sans bloquer.
const WARN_PATTERNS: { category: string; re: RegExp }[] = [
  {
    category: "high_stakes_advice",
    re: /\b(diagnostic médical|diagnostic medical|posologie|dosage médicament|dosage medicament|conseil juridique|montage fiscal)\b/i,
  },
];

// Détecte des secrets dans une sortie (post-check) : clés API échappées.
const SECRET_LEAK_RE =
  /\b(sk-ant-[A-Za-z0-9_-]{20,}|sk-[A-Za-z0-9]{20,}|AIza[A-Za-z0-9_-]{20,}|whsec_[A-Za-z0-9]{20,})\b/;

function mode(stage: SafetyStage): "block" | "warn" | "off" {
  const raw =
    stage === "pre"
      ? process.env.MODERATION_PRE_MODE
      : process.env.MODERATION_POST_MODE;
  if (raw === "off") return "off";
  if (raw === "warn") return "warn";
  return "block";
}

function moderationEnabled(): boolean {
  return process.env.MODERATION_ENABLED !== "false";
}

// Pré-vérification : appelée AVANT tout appel fournisseur.
export function precheckPrompt(prompt: string): SafetyResult {
  if (!moderationEnabled()) return ALLOW;

  for (const { category, re } of ESCALATE_PATTERNS) {
    if (re.test(prompt)) {
      return {
        decision: "ESCALATE",
        category,
        message:
          "Si vous êtes en détresse, vous n'êtes pas seul. En France, vous pouvez appeler le 3114 (numéro national de prévention du suicide), 24h/24 et gratuit.",
      };
    }
  }

  for (const { category, re } of BLOCK_PATTERNS) {
    if (re.test(prompt)) {
      if (mode("pre") === "block") {
        return {
          decision: "BLOCK",
          category,
          message:
            "Cette demande ne peut pas être traitée. Reformulez si votre intention est différente.",
        };
      }
      return {
        decision: "WARN",
        category,
        message: "Cette demande touche un sujet sensible.",
      };
    }
  }

  for (const { category, re } of WARN_PATTERNS) {
    if (re.test(prompt)) {
      return {
        decision: "WARN",
        category,
        message:
          "Réponse fournie à titre informatif : pour une décision importante (santé, droit, finances), consultez un professionnel.",
      };
    }
  }

  return ALLOW;
}

// Post-vérification : appelée AVANT d'afficher / exporter la réponse finale.
export function postcheckAnswer(answer: string): SafetyResult {
  if (!moderationEnabled()) return ALLOW;

  if (SECRET_LEAK_RE.test(answer)) {
    return {
      decision: mode("post") === "block" ? "BLOCK" : "WARN",
      category: "secret_leak",
      message:
        "La réponse a été retenue car elle contenait des informations sensibles.",
    };
  }

  for (const { category, re } of BLOCK_PATTERNS) {
    if (re.test(answer)) {
      return {
        decision: mode("post") === "block" ? "BLOCK" : "WARN",
        category,
        message: "La réponse a été retenue pour des raisons de sécurité.",
      };
    }
  }

  return ALLOW;
}
