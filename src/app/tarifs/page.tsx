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
    description: "Découvrez ce que plusieurs modèles apportent à une même question.",
    credits: "100 crédits offerts",
    equivalent: "Environ 5 synthèses standard",
    features: [
      "Réponse consolidée",
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
    description: "Pour vos recherches, analyses et travaux réguliers.",
    credits: "1 200 crédits / mois",
    equivalent: "Environ 60 synthèses standard",
    features: [
      "Analyses rapides, standard et approfondies",
      "Jusqu’à 10 projets",
      "Historique complet",
      "Export des réponses",
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
    description: "Pour les réponses qui engagent votre travail.",
    credits: "3 000 crédits / mois",
    equivalent: "Environ 150 synthèses standard",
    features: [
      "Tout ce qui est inclus dans Essentiel",
      "Analyses approfondies",
      "Projets illimités",
      "Exports avancés",
      "Tâches longues estimées avant exécution",
    ],
    cta: "Choisir Pro",
    featured: true,
  },
];

const FEATURES = [
  ["Question rapide", "5 à 10 crédits", "Vérification légère"],
  [`Synthèse standard ${SITE_CONFIG.name}`, "20 crédits", "Comparaison multi-modèles"],
  ["Analyse approfondie", "À partir de 60 crédits", "Selon la complexité"],
  ["Analyse de document", "Estimation préalable", "Selon la longueur du contexte"],
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
              Des règles claires, sans quota caché
            </span>
          </div>
          <h1 className="m-0 max-w-[760px] text-[42px] font-bold leading-[1.02] tracking-[-0.04em] sm:text-[64px]">
            Choisissez votre rythme.
            <br />
            <span className="bg-gradient-to-r from-accent via-[#7FF0C2] to-accent bg-clip-text text-transparent drop-shadow-[0_0_38px_rgba(43,245,168,.35)]">
              Gardez le contrôle de chaque analyse.
            </span>
          </h1>
          <p className="m-0 mt-[24px] max-w-[620px] text-[18px] leading-[1.55] text-muted-fg">
            Chaque formule inclut un budget mensuel de crédits. Avant chaque
            tâche, vous connaissez son coût maximal. Aucun dépassement sans
            votre confirmation.
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
              <span>Action</span>
              <span>Prix</span>
              <span>Note</span>
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
            Estimations fondées sur une synthèse standard à 20 crédits. La
            consommation varie selon le mode, les modèles mobilisés et la taille
            du contexte.
          </p>
        </section>

        <section className="pb-[70px]">
          <div className="glass rounded-2xl p-7 text-center">
            <p className="m-0 mb-2 font-mono text-[12px] tracking-[0.08em] text-[#4FE3A8]">
              POUR LES ÉQUIPES
            </p>
            <h2 className="m-0 text-[25px] font-bold tracking-[-0.02em]">
              Vous équipez une agence ou un cabinet ?
            </h2>
            <p className="mx-auto mb-0 mt-3 max-w-[560px] text-[14.5px] text-muted-fg">
              L&apos;offre Équipe arrive prochainement. Contactez-nous pour nous
              parler de vos besoins de collaboration et de facturation.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
