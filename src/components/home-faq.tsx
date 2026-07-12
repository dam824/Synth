"use client";

import { useState } from "react";

import { SITE_CONFIG } from "@/config/site";

const FAQ = [
  {
    q: `J'utilise déjà ChatGPT. Pourquoi ${SITE_CONFIG.name} ?`,
    a: `ChatGPT vous donne une réponse. ${SITE_CONFIG.name} en confronte plusieurs : les convergences sont réunies, les désaccords importants restent visibles et un indicateur de convergence vous dit à quel point les analyses s'accordent. Vous gagnez le recul que donne une comparaison, sans la faire à la main.`,
  },
  {
    q: "Plusieurs IA ont-elles forcément raison ?",
    a: `Non, et ${SITE_CONFIG.name} ne le prétend pas. Plusieurs analyses peuvent converger vers une même erreur. C'est pourquoi ${SITE_CONFIG.name} affiche les points à vérifier et les incertitudes plutôt que de promettre une réponse garantie. L'objectif est davantage de recul, pas l'infaillibilité.`,
  },
  {
    q: "Comment fonctionnent les crédits ?",
    a: "Chaque formule inclut un budget mensuel de crédits. Une synthèse standard consomme environ 20 crédits ; une question rapide, 5 à 10. Le coût maximal est annoncé avant chaque exécution et aucun dépassement n'a lieu sans votre confirmation.",
  },
  {
    q: "Que se passe-t-il si un modèle ne répond pas ?",
    a: `La synthèse est produite à partir des analyses disponibles, et ${SITE_CONFIG.name} indique quels modèles ont effectivement contribué. Si le nombre d'analyses est insuffisant pour une confrontation utile, la tâche n'est pas facturée.`,
  },
  {
    q: "Puis-je résilier mon abonnement facilement ?",
    a: "Oui. Les formules sont sans engagement et résiliables à tout moment depuis votre compte, en quelques clics. Vous conservez l'accès jusqu'à la fin de la période payée.",
  },
  {
    q: "Comment mes données sont-elles traitées ?",
    a: "Vos questions et synthèses sont stockées chiffrées au repos. Vous contrôlez votre historique — consultation, export, suppression — et chaque synthèse indique quels modèles ont été sollicités. Le détail figure dans notre politique de confidentialité.",
  },
];

export function HomeFaq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="flex flex-col gap-3">
      {FAQ.map((item, i) => {
        const isOpen = open === i;
        return (
          <div
            key={item.q}
            className="glass-soft overflow-hidden rounded-[14px]"
          >
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left text-[16.5px] font-semibold text-foreground transition hover:text-[#7FF0C2]"
            >
              <span>{item.q}</span>
              <span
                aria-hidden
                className="shrink-0 text-[18px] text-accent transition-transform duration-300"
                style={{ transform: isOpen ? "rotate(45deg)" : "rotate(0deg)" }}
              >
                ＋
              </span>
            </button>
            <div
              className="overflow-hidden transition-all duration-300"
              style={{
                maxHeight: isOpen ? 320 : 0,
                opacity: isOpen ? 1 : 0,
              }}
            >
              <p className="m-0 px-6 pb-[22px] text-[15px] leading-[1.7] text-muted-fg">
                {item.a}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
