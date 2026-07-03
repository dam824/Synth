import Link from "next/link";

import { auth } from "@/auth";
import { Diamond, Logo } from "@/components/brand";
import { NeonBorder } from "@/components/neon-border";

const PACKS = [
  {
    key: "starter",
    name: "Starter",
    price: "5 EUR",
    credits: "500",
    bonus: "0",
    ratio: "100",
    klarna: "Non",
    featured: false,
  },
  {
    key: "creator",
    name: "Creator",
    price: "15 EUR",
    credits: "1 800",
    bonus: "300",
    ratio: "120",
    klarna: "Non",
    featured: true,
  },
  {
    key: "pro",
    name: "Pro",
    price: "39 EUR",
    credits: "5 500",
    bonus: "1 600",
    ratio: "141",
    klarna: "Optionnel",
    featured: false,
  },
  {
    key: "studio",
    name: "Studio",
    price: "99 EUR",
    credits: "16 000",
    bonus: "6 100",
    ratio: "162",
    klarna: "Oui",
    featured: false,
  },
  {
    key: "agency",
    name: "Agency",
    price: "249 EUR",
    credits: "45 000",
    bonus: "20 100",
    ratio: "181",
    klarna: "Oui",
    featured: false,
  },
  {
    key: "production",
    name: "Production",
    price: "499 EUR",
    credits: "100 000",
    bonus: "50 100",
    ratio: "200",
    klarna: "Oui",
    featured: false,
  },
];

const FEATURES = [
  ["Réponse multi-modèles Orsic", "15 crédits", "OpenAI + Anthropic + Gemini"],
  ["Prompt texte simple", "5 crédits", "Question légère"],
  ["Analyse document court", "20 crédits", "Petit fichier ou contenu collé"],
  ["Analyse document long", "60 crédits", "Gros contexte"],
  ["Image standard", "30 crédits", "Qualité standard"],
  ["Image haute qualité", "80 crédits", "Mode premium"],
  ["Variation image", "25 crédits", "Remix ou variante"],
  ["Upscale image", "40 crédits", "Prix fixe MVP"],
  ["Voix courte", "20 crédits", "Génération courte"],
  ["Voix longue", "80 crédits", "Durée plus élevée"],
  ["Animation courte", "120 crédits", "Mouvement court"],
  ["Vidéo courte", "200 crédits", "Génération vidéo courte"],
  ["Vidéo haute qualité", "500 crédits", "Résolution ou durée supérieure"],
  ["Workflow ComfyUI", "100 crédits", "Prix de base ajustable"],
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
  const selectedPack = PACKS.find((pack) => pack.key === params?.pack);
  const appHref = session?.user ? "/app" : "/login";

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="synth-orbs" />

      <div className="synth-scroll relative z-10 mx-auto max-w-[1120px] px-6">
        <nav className="glass sticky top-4 z-30 mt-5 flex items-center justify-between rounded-2xl py-[11px] pl-[18px] pr-3">
          <Link href="/" aria-label="Accueil Orsic">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/tarifs"
              className="glass-accent flex h-[38px] items-center rounded-[10px] px-[14px] text-[14px] font-semibold text-[#7FF0C2]"
            >
              Tarifs
            </Link>
            <Link
              href="/login"
              className="hidden h-[38px] items-center rounded-[10px] px-[14px] text-[14px] font-medium text-muted-fg transition hover:bg-white/[.05] sm:flex"
            >
              Se connecter
            </Link>
            <Link
              href={appHref}
              className="glass-accent flex h-[38px] items-center rounded-[10px] px-4 text-[14px] font-semibold tracking-[-0.01em] text-[#7FF0C2] transition hover:brightness-110"
            >
              Essayer Orsic
            </Link>
          </div>
        </nav>

        <header className="pb-10 pt-[70px]">
          <div className="glass-accent mb-[24px] inline-flex items-center gap-2 rounded-full px-[13px] py-[6px]">
            <span className="h-[6px] w-[6px] rounded-full bg-accent shadow-glow" />
            <span className="text-[12.5px] font-medium text-[#6FE9B7]">
              Crédits simples, prix visibles
            </span>
          </div>
          <h1 className="m-0 max-w-[760px] text-[42px] font-bold leading-[1.02] tracking-[-0.04em] sm:text-[64px]">
            Choisissez vos crédits.
            <br />
            <span className="bg-gradient-to-r from-accent via-[#7FF0C2] to-accent bg-clip-text text-transparent drop-shadow-[0_0_38px_rgba(43,245,168,.35)]">
              Utilisez-les quand vous voulez.
            </span>
          </h1>
          <p className="m-0 mt-[24px] max-w-[620px] text-[18px] leading-[1.55] text-muted-fg">
            Les premières questions sont offertes. Ensuite, chaque action
            consomme un nombre clair de crédits avant lancement.
          </p>
          {params?.checkout === "soon" ? (
            <div className="glass-accent mt-7 max-w-[620px] rounded-2xl px-5 py-4 text-[14.5px] leading-[1.5] text-[#B9F8DA]">
              Le paiement du pack {selectedPack?.name ?? "sélectionné"} sera
              branché via Stripe. Pour l&apos;instant, aucun débit n&apos;est
              lancé depuis cette page.
            </div>
          ) : null}
        </header>

        <section className="grid grid-cols-1 gap-[16px] pb-[48px] lg:grid-cols-3">
          {PACKS.map((pack) => (
            <NeonBorder
              key={pack.key}
              radius={16}
              className={pack.featured ? "shadow-accent" : ""}
              innerClassName="h-full p-5"
            >
              <div className="flex h-full flex-col">
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="m-0 text-[22px] font-bold tracking-[-0.02em]">
                      {pack.name}
                    </h2>
                    <p className="m-0 mt-1 text-[13px] text-faint">
                      {pack.ratio} crédits / EUR
                    </p>
                  </div>
                  {pack.featured ? (
                    <span className="glass-accent rounded-full px-3 py-1 text-[12px] font-semibold text-[#7FF0C2]">
                      Recommandé
                    </span>
                  ) : null}
                </div>

                <p className="m-0 text-[34px] font-bold tracking-[-0.03em]">
                  {pack.price}
                </p>
                <p className="m-0 mt-2 text-[16px] font-semibold text-[#7FF0C2]">
                  {pack.credits} crédits
                </p>

                <div className="mt-5 grid gap-2 text-[14px] text-muted-fg">
                  <div className="flex justify-between gap-4">
                    <span>Bonus inclus</span>
                    <span className="text-foreground">{pack.bonus}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Klarna</span>
                    <span className="text-foreground">{pack.klarna}</span>
                  </div>
                </div>

                <Link
                  href={
                    session?.user
                      ? `/tarifs?checkout=soon&pack=${pack.key}`
                      : `/login?callbackUrl=/tarifs?pack=${pack.key}`
                  }
                  className="mt-6 inline-flex h-[44px] items-center justify-center rounded-[12px] bg-primary px-4 text-[14px] font-semibold text-primary-fg shadow-glow transition hover:opacity-90"
                >
                  Acheter ce pack
                </Link>
              </div>
            </NeonBorder>
          ))}
        </section>

        <section className="pb-[60px]">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="m-0 mb-2 font-mono text-[12px] tracking-[0.08em] text-[#4FE3A8]">
                COÛTS PAR ACTION
              </p>
              <h2 className="m-0 text-[30px] font-bold tracking-[-0.03em]">
                Les tarifs avant de lancer
              </h2>
            </div>
            <div className="flex items-center gap-2 text-[13px] text-muted-fg">
              <Diamond size={9} />
              Les prix restent ajustables selon les fournisseurs.
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
        </section>
      </div>
    </div>
  );
}
