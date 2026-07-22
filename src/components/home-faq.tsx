"use client";

import { useState } from "react";

import { SITE_CONFIG } from "@/config/site";

const FAQ = [
  {
    q: `J'utilise déjà ChatGPT. Pourquoi ${SITE_CONFIG.name} ?`,
    a: `Un chatbot mono-modèle produit directement un résultat. ${SITE_CONFIG.name} lance plusieurs analyses depuis une seule demande, confronte leurs conclusions et vous remet une synthèse unique. Les désaccords et les incertitudes restent visibles au lieu d'être comparés à la main dans plusieurs onglets.`,
  },
  {
    q: "Des conclusions proches garantissent-elles que la synthèse est vraie ?",
    a: `Non. La convergence mesure le niveau d'accord entre les analyses, jamais la vérité du résultat. Plusieurs modèles peuvent partager la même erreur. ${SITE_CONFIG.name} fait donc ressortir les points à vérifier et les incertitudes : la méthode apporte davantage de recul, pas une garantie d'infaillibilité.`,
  },
  {
    q: "Comment fonctionnent les crédits ?",
    a: "Chaque formule inclut un budget mensuel de crédits. Une synthèse standard consomme environ 20 crédits ; une demande rapide, 5 à 10. Le coût maximal est annoncé avant chaque exécution et aucun dépassement n'a lieu sans votre confirmation.",
  },
  {
    q: "Que se passe-t-il si un modèle ne répond pas ?",
    a: `La synthèse est produite à partir des analyses disponibles, et ${SITE_CONFIG.name} indique quels modèles ont effectivement contribué. Si leur nombre est insuffisant pour une confrontation utile, l'opération n'est pas facturée.`,
  },
  {
    q: "Pourquoi la synthèse n'est-elle pas instantanée ?",
    a: `Plusieurs modèles analysent d'abord votre demande. ${SITE_CONFIG.name} confronte ensuite leurs conclusions avant de produire la synthèse. Vous suivez chaque étape en direct pendant ce traitement.`,
  },
  {
    q: "Puis-je résilier mon abonnement facilement ?",
    a: "Oui. Les formules sont sans engagement et résiliables à tout moment depuis votre compte, en quelques clics. Vous conservez l'accès jusqu'à la fin de la période payée.",
  },
  {
    q: "Comment mes données sont-elles traitées ?",
    a: "Vos demandes et synthèses sont stockées chiffrées au repos. Vous contrôlez votre historique — consultation, export, suppression — et chaque synthèse indique quels modèles ont été sollicités. Le détail figure dans notre politique de confidentialité.",
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
