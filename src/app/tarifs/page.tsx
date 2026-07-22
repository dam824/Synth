import Link from "next/link";

import { auth } from "@/auth";
import { BillingCheckoutButton } from "@/components/billing-checkout-button";
import { Diamond, Logo } from "@/components/brand";
import { PricingTiltCard } from "@/components/pricing-tilt-card";
import { SITE_CONFIG } from "@/config/site";

const PLANS = [
  {
    key: "decouverte",
    name: "Découverte",
    price: "0 €",
    cadence: "pour commencer",
    description: "Testez l’analyse croisée sur vos vraies demandes.",
    credits: "100 crédits offerts",
    equivalent: "Jusqu’à 5 synthèses standard",
    features: [
      "Synthèse consolidée",
      "Désaccords importants visibles",
      "1 projet",
      "Historique pendant 30 jours",
      "Crédits non reportables",
    ],
    cta: "Essayer gratuitement",
    featured: false,
  },
  {
    key: "essentiel",
    name: "Essentiel",
    price: "14,90 €",
    cadence: "TTC / mois",
    description: "Pour vos recherches et analyses régulières.",
    credits: "1 200 crédits / mois",
    equivalent: "Jusqu’à 60 synthèses standard",
    features: [
      "Synthèses standard et approfondies",
      "Jusqu’à 10 projets",
      "Historique complet",
      "Export des synthèses",
      "Report plafonné à une mensualité",
    ],
    cta: "Choisir Essentiel",
    featured: false,
  },
  {
    key: "pro",
    name: "Pro",
    price: "29,90 €",
    cadence: "TTC / mois",
    description: "Pour les décisions qui engagent votre travail.",
    credits: "3 000 crédits / mois",
    equivalent: "Jusqu’à 150 synthèses standard",
    features: [
      "Tout ce qui est inclus dans Essentiel",
      "Analyse de documents",
      "Projets illimités",
      "Exports avancés",
      "Tâches longues estimées avant exécution",
    ],
    cta: "Choisir Pro",
    featured: true,
  },
];

const FEATURES = [
  ["Demande rapide", "5 à 10 crédits", "Vérification légère"],
  [`Synthèse standard ${SITE_CONFIG.name}`, "20 crédits", "Confrontation multi-modèles"],
  ["Analyse approfondie", "60 à environ 200 crédits", "Selon la complexité et la longueur"],
  ["Analyse de document", "Estimation préalable", "Selon le contexte transmis"],
];

const FAQ = [
  {
    question: `Quelle différence avec un chatbot classique ?`,
    answer: `${SITE_CONFIG.name} lance plusieurs analyses à partir d’une seule demande, confronte leurs conclusions et vous remet une synthèse unique. Un chatbot mono-modèle produit directement sa propre réponse.`,
  },
  {
    question: "Pourquoi la synthèse n’est-elle pas instantanée ?",
    answer: `Plusieurs modèles analysent votre demande avant que leurs conclusions soient confrontées et synthétisées. Vous suivez chaque étape en direct.`,
  },
  {
    question: "Comment fonctionnent les crédits ?",
    answer: "Chaque opération utilise un nombre de crédits adapté au mode, à la complexité et au contexte. Le coût maximal est affiché avant validation, sans débit supplémentaire sans votre confirmation.",
  },
  {
    question: "Que signifie le niveau de convergence ?",
    answer: "Il mesure le niveau d’accord entre les analyses. Des conclusions proches renforcent la cohérence du résultat, mais ne garantissent pas qu’il est vrai.",
  },
  {
    question: "Que se passe-t-il si un modèle échoue ?",
    answer: `${SITE_CONFIG.name} rend l’échec visible et consolide les analyses effectivement disponibles, sans présenter une analyse manquante comme obtenue.`,
  },
  {
    question: "Puis-je récupérer ou supprimer mes données ?",
    answer: "Vous pouvez exporter vos synthèses et supprimer votre historique depuis votre espace. Les limites de conservation applicables sont indiquées dans votre formule.",
  },
  {
    question: "Puis-je résilier mon abonnement ?",
    answer: "Oui. Les offres mensuelles sont sans engagement et résiliables à tout moment.",
  },
];

type TarifsPageProps = {
  searchParams?: Promise<{
    checkout?: string;
    pack?: string;
  }>;
};

export default async function TarifsPage({ searchParams }: TarifsPageProps) {
  const session = await auth();
  const params = await searchParams;
  const appHref = session?.user ? "/app" : "/login";

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="synth-orbs" />

      <div className="synth-scroll relative z-10 mx-auto max-w-[1120px] px-6">
        <nav className="glass sticky top-4 z-30 mt-5 flex items-center justify-between rounded-2xl py-[11px] pl-[18px] pr-3">
          <Link href="/" aria-label={`Accueil ${SITE_CONFIG.name}`}>
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/tarifs"
              className="glass-accent flex h-[38px] items-center rounded-[10px] px-[14px] text-[14px] font-semibold text-[#7FF0C2]"
            >
              Tarifs
            </Link>
            {!session?.user ? (
              <Link
                href="/login"
                className="hidden h-[38px] items-center rounded-[10px] px-[14px] text-[14px] font-medium text-muted-fg transition hover:bg-white/[.05] sm:flex"
              >
                Se connecter
              </Link>
            ) : null}
            <Link
              href={appHref}
              className="glass-accent flex h-[38px] items-center rounded-[10px] px-4 text-[14px] font-semibold tracking-[-0.01em] text-[#7FF0C2] transition hover:brightness-110"
            >
              {session?.user ? "Accéder au chat" : `Essayer ${SITE_CONFIG.name}`}
            </Link>
          </div>
        </nav>

        <header className="pb-10 pt-[70px]">
          <div className="glass-accent mb-[24px] inline-flex items-center gap-2 rounded-full px-[13px] py-[6px]">
            <span className="h-[6px] w-[6px] rounded-full bg-accent shadow-glow" />
            <span className="text-[12.5px] font-medium text-[#6FE9B7]">
              Votre solde et votre consommation restent visibles
            </span>
          </div>
          <h1 className="m-0 max-w-[760px] text-[42px] font-bold leading-[1.02] tracking-[-0.04em] sm:text-[64px]">
            Une demande. Plusieurs analyses.
            <br />
            <span className="bg-gradient-to-r from-accent via-[#7FF0C2] to-accent bg-clip-text text-transparent drop-shadow-[0_0_38px_rgba(43,245,168,.35)]">
              Une synthèse plus solide.
            </span>
          </h1>
          <p className="m-0 mt-[24px] max-w-[620px] text-[18px] leading-[1.55] text-muted-fg">
            Plusieurs modèles analysent votre demande. {SITE_CONFIG.name}
            confronte leurs conclusions, fait ressortir les désaccords et
            produit une synthèse unique.
          </p>
          {params?.checkout === "success" ? (
            <div className="glass-accent mt-7 max-w-[620px] rounded-2xl px-5 py-4 text-[14.5px] leading-[1.5] text-[#B9F8DA]">
              <p className="m-0">
                Paiement reçu. Votre abonnement et vos crédits ont été confirmés.
              </p>
              <Link
                href="/app"
                className="mt-3 inline-flex font-semibold text-accent underline decoration-accent/40 underline-offset-4"
              >
                Accéder au chat →
              </Link>
            </div>
          ) : null}
          {params?.checkout === "cancel" ? (
            <div className="glass mt-7 max-w-[620px] rounded-2xl px-5 py-4 text-[14.5px] leading-[1.5] text-muted-fg">
              Paiement annulé. Aucun abonnement n&apos;a été créé.
            </div>
          ) : null}
        </header>

        <section className="grid gap-5 pb-[54px] md:grid-cols-2">
          <div className="glass rounded-2xl p-7">
            <p className="m-0 mb-3 font-mono text-[12px] tracking-[0.08em] text-faint">
              SANS {SITE_CONFIG.name.toUpperCase()}
            </p>
            <h2 className="m-0 text-[24px] font-bold tracking-[-0.025em]">
              Comparer plusieurs outils à la main
            </h2>
            <p className="mb-0 mt-3 text-[14.5px] leading-[1.65] text-muted-fg">
              Répéter votre demande, rassembler les résultats, repérer les
              contradictions puis construire vous-même une conclusion.
            </p>
          </div>
          <div className="glass-accent rounded-2xl p-7">
            <p className="m-0 mb-3 font-mono text-[12px] tracking-[0.08em] text-[#6FE9B7]">
              AVEC {SITE_CONFIG.name.toUpperCase()}
            </p>
            <h2 className="m-0 text-[24px] font-bold tracking-[-0.025em]">
              Une seule demande, une synthèse exploitable
            </h2>
            <p className="mb-0 mt-3 text-[14.5px] leading-[1.65] text-muted-fg">
              Les analyses sont lancées ensemble, leurs désaccords sont rendus
              visibles et leurs conclusions sont consolidées en un seul résultat.
            </p>
          </div>
        </section>

        <section className="pb-[56px]">
          <div className="glass rounded-2xl p-7 sm:p-9">
            <p className="m-0 mb-3 font-mono text-[12px] tracking-[0.08em] text-[#4FE3A8]">
              LA VALEUR D’UNE SYNTHÈSE
            </p>
            <h2 className="m-0 max-w-[760px] text-[30px] font-bold tracking-[-0.03em]">
              La confrontation est faite pour vous, sans multiplier les onglets.
            </h2>
            <p className="mb-0 mt-4 max-w-[760px] text-[15px] leading-[1.65] text-muted-fg">
              Une synthèse {SITE_CONFIG.name} vous évite d’interroger plusieurs
              outils, de copier leurs réponses et de comparer leurs contradictions
              à la main.
            </p>
            <div className="mt-7 grid gap-4 md:grid-cols-3">
              {[
                "Plusieurs analyses lancées depuis une seule demande",
                "Désaccords et incertitudes rendus visibles",
                "Une synthèse unique, prête à être exploitée",
              ].map((benefit) => (
                <div key={benefit} className="flex gap-3 rounded-xl border border-white/[.06] bg-black/10 p-4 text-[14px] leading-[1.55] text-muted-fg">
                  <Diamond size={9} />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative pb-[64px] pt-4">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-x-20 -inset-y-12 bg-[radial-gradient(ellipse_at_78%_48%,rgba(26,239,161,.13),transparent_34%),radial-gradient(ellipse_at_48%_10%,rgba(74,205,255,.06),transparent_32%)] blur-2xl"
          />
          <div className="relative grid grid-cols-1 gap-5 lg:grid-cols-3 lg:items-stretch">
            {PLANS.map((plan) => (
              <PricingTiltCard key={plan.key} featured={plan.featured}>
              <div className="flex h-full min-h-[570px] flex-col p-7">
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="m-0 text-[28px] font-bold tracking-[-0.03em]">
                      {plan.name}
                    </h2>
                    <p className="m-0 mt-2 min-h-[42px] text-[13.5px] leading-[1.55] text-muted-fg">
                      {plan.description}
                    </p>
                  </div>
                </div>

                <p className="m-0 mt-2 text-[42px] font-bold tracking-[-0.045em] text-foreground">
                  {plan.price}
                </p>
                <p className="m-0 mt-1 text-[13px] text-faint">{plan.cadence}</p>
                <p className="m-0 mt-4 text-[16px] font-semibold text-[#7FF0C2]">
                  {plan.credits}
                </p>
                <p className="m-0 mt-1 text-[13px] text-muted-fg">{plan.equivalent}</p>

                <ul className="mt-6 flex flex-1 list-none flex-col gap-3.5 p-0 text-[14px] leading-[1.5] text-muted-fg">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <span className="mt-[1px] text-accent drop-shadow-[0_0_8px_rgba(43,245,168,.5)]">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {session?.user && (plan.key === "essentiel" || plan.key === "pro") ? (
                  <BillingCheckoutButton planKey={plan.key}>
                    {plan.cta}
                  </BillingCheckoutButton>
                ) : (
                  <Link
                    href={
                      session?.user
                        ? "/app"
                        : `/login?callbackUrl=${encodeURIComponent(`/tarifs?pack=${plan.key}`)}`
                    }
                    className="mt-6 inline-flex h-[44px] items-center justify-center rounded-[12px] bg-primary px-4 text-[14px] font-semibold text-primary-fg shadow-glow transition hover:brightness-110"
                  >
                    {plan.cta}
                  </Link>
                )}
                <p
                  className={`mb-0 mt-3 min-h-[17px] text-center text-[11.5px] text-faint ${
                    plan.key === "decouverte" ? "invisible" : ""
                  }`}
                  aria-hidden={plan.key === "decouverte"}
                >
                  Sans engagement · Résiliable à tout moment
                </p>
              </div>
              </PricingTiltCard>
            ))}
          </div>
        </section>

        <section className="pb-[60px]">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="m-0 mb-2 font-mono text-[12px] tracking-[0.08em] text-[#4FE3A8]">
                CONSOMMATION INDICATIVE
              </p>
              <h2 className="m-0 text-[30px] font-bold tracking-[-0.03em]">
                Le coût est annoncé avant de lancer
              </h2>
            </div>
            <div className="flex items-center gap-2 text-[13px] text-muted-fg">
              <Diamond size={9} />
              Aucun dépassement sans confirmation.
            </div>
          </div>

          <div className="glass overflow-hidden rounded-2xl">
            <div className="grid grid-cols-[1.3fr_.7fr_1fr] border-b border-white/[.06] px-5 py-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-faint">
              <span>Opération</span>
              <span>Coût indicatif</span>
              <span>Explication</span>
            </div>
            {FEATURES.map(([name, price, note]) => (
              <div
                key={name}
                className="grid grid-cols-1 gap-2 border-b border-white/[.05] px-5 py-4 text-[14.5px] last:border-b-0 sm:grid-cols-[1.3fr_.7fr_1fr]"
              >
                <span className="font-medium text-foreground">{name}</span>
                <span className="font-semibold text-[#7FF0C2]">{price}</span>
                <span className="text-muted-fg">{note}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[12.5px] leading-[1.5] text-faint">
            Le coût maximal est affiché avant validation. Aucun débit
            supplémentaire sans votre confirmation.
          </p>
        </section>

        <section className="pb-[60px]">
          <div className="glass rounded-2xl p-7 sm:p-9">
            <p className="m-0 mb-3 font-mono text-[12px] tracking-[0.08em] text-[#4FE3A8]">
              CONFIANCE ET CONTRÔLE
            </p>
            <h2 className="m-0 text-[28px] font-bold tracking-[-0.03em]">
              Vous gardez la main à chaque étape.
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {[
                "Coût maximal annoncé avant validation",
                "Solde et consommation visibles à tout moment",
                "Désaccords et échecs de modèles signalés",
                "Historique exportable et supprimable depuis votre espace",
              ].map((item) => (
                <div key={item} className="flex gap-3 text-[14.5px] leading-[1.55] text-muted-fg">
                  <span className="text-accent">✓</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="pb-[64px]">
          <p className="m-0 mb-2 font-mono text-[12px] tracking-[0.08em] text-[#4FE3A8]">FAQ</p>
          <h2 className="m-0 mb-6 text-[30px] font-bold tracking-[-0.03em]">Avant de vous lancer</h2>
          <div className="grid gap-3">
            {FAQ.map((item) => (
              <details key={item.question} className="glass group rounded-2xl px-5 py-4 open:pb-5">
                <summary className="cursor-pointer list-none pr-8 text-[15px] font-semibold marker:content-none">
                  {item.question}
                  <span className="float-right text-accent transition group-open:rotate-45">+</span>
                </summary>
                <p className="mb-0 mt-3 max-w-[820px] text-[14px] leading-[1.65] text-muted-fg">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="pb-[80px]">
          <div className="glass-accent rounded-2xl px-7 py-10 text-center sm:px-10">
            <h2 className="m-0 text-[30px] font-bold tracking-[-0.03em]">
              Confrontez votre première demande.
            </h2>
            <p className="mx-auto mb-0 mt-3 max-w-[600px] text-[14.5px] leading-[1.6] text-muted-fg">
              Commencez avec 100 crédits offerts, sans carte bancaire, et voyez
              ce que plusieurs analyses apportent à votre décision.
            </p>
            <Link href={appHref} className="mt-7 inline-flex h-[46px] items-center justify-center rounded-[12px] bg-primary px-6 text-[14px] font-semibold text-primary-fg shadow-glow transition hover:brightness-110">
              Essayer gratuitement
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
