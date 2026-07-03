import Link from "next/link";

import { auth } from "@/auth";
import { Diamond, Logo } from "@/components/brand";
import { NeonBorder } from "@/components/neon-border";

// Étapes de fonctionnement (titres impactants).
const STEPS = [
  {
    n: "1",
    title: "Écrivez une fois",
    body: "Une seule question, dans vos mots. Aucun réglage, aucun modèle à choisir.",
  },
  {
    n: "2",
    title: "Orsic fait travailler plusieurs IA",
    body: "Les meilleurs modèles analysent votre demande en parallèle, chacun avec ses forces.",
  },
  {
    n: "3",
    title: "Recevez la meilleure réponse",
    body: "Une synthèse claire, arbitrée, notée en confiance. Rien à comparer vous-même.",
  },
];

// Ce que l'utilisateur économise (section gain de temps).
const TIME_SAVERS = [
  "Changer d'outil",
  "Copier-coller le même prompt",
  "Lire plusieurs réponses longues",
  "Comparer ligne par ligne",
  "Choisir quelle réponse garder",
  "Refaire la synthèse à la main",
];

// Fonctionnalités principales (6 blocs).
const FEATURES = [
  {
    title: "Prompt unique",
    body: "Une seule demande, distribuée aux meilleurs modèles. Vous n'écrivez qu'une fois.",
  },
  {
    title: "Plusieurs IA en parallèle",
    body: "Vos questions sont traitées simultanément par plusieurs modèles de premier plan.",
  },
  {
    title: "Comparaison automatique",
    body: "Orsic confronte les réponses, repère les convergences et filtre le bruit.",
  },
  {
    title: "Désaccords visibles",
    body: "Quand les modèles divergent, Orsic le montre au lieu de masquer l'incertitude.",
  },
  {
    title: "Synthèse notée en confiance",
    body: "Une réponse unique, accompagnée d'un niveau de confiance : élevé, modéré ou à vérifier.",
  },
  {
    title: "Historique & sources",
    body: "Retrouvez vos échanges et, si besoin, ce que chaque piste a réellement proposé.",
  },
];

// Comparatif IA classique vs Orsic.
const COMPARISON: [string, string][] = [
  ["Une seule réponse", "Plusieurs réflexions confrontées"],
  ["Aucune comparaison", "Comparaison automatique"],
  ["Incertitude cachée", "Désaccords rendus visibles"],
  ["Synthèse à faire soi-même", "Synthèse automatique"],
  ["Fiabilité floue", "Niveau de confiance affiché"],
  ["Plus de temps perdu", "Gain de temps immédiat"],
];

// Cas d'usage (profils).
const USE_CASES = [
  "Entrepreneur — trancher vite sur une décision sans réunir dix avis.",
  "Développeur — croiser plusieurs approches et repérer les angles morts.",
  "Marketeur — un positionnement clair, sans arbitrer entre trois versions.",
  "Consultant — une réponse solide et sourcée, prête à présenter.",
  "Étudiant — comprendre un sujet, avec les nuances mises en avant.",
  "Chercheur — confronter des raisonnements et voir où ils divergent.",
  "Créateur de contenu — des idées confrontées, pas une seule piste.",
];

export default async function HomePage() {
  const session = await auth();
  const startHref = session?.user ? "/app" : "/login";

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="synth-orbs" />

      <div className="synth-scroll relative z-10 mx-auto max-w-[1120px] px-6">
        {/* Nav flottante (glass) */}
        <nav className="glass sticky top-4 z-30 mt-5 flex items-center justify-between rounded-2xl py-[11px] pl-[18px] pr-3">
          <Logo />
          <div className="flex items-center gap-2">
            <Link
              href="/tarifs"
              className="flex h-[38px] items-center rounded-[10px] px-[14px] text-[14px] font-medium text-muted-fg transition hover:bg-white/[.05] hover:text-foreground"
            >
              Tarifs
            </Link>
            <Link
              href="/login"
              className="flex h-[38px] items-center rounded-[10px] px-[14px] text-[14px] font-medium text-muted-fg transition hover:bg-white/[.05]"
            >
              Se connecter
            </Link>
            <Link
              href={startHref}
              className="glass-accent flex h-[38px] items-center rounded-[10px] px-4 text-[14px] font-semibold tracking-[-0.01em] text-[#7FF0C2] transition hover:brightness-110"
            >
              Essayer Orsic
            </Link>
          </div>
        </nav>

        {/* Hero asymétrique */}
        <header className="grid grid-cols-1 items-center gap-10 py-[72px] md:grid-cols-[1.05fr_.95fr]">
          <div>
            <div className="glass-accent mb-[26px] inline-flex items-center gap-2 rounded-full px-[13px] py-[6px]">
              <span className="animate-synth-glow h-[6px] w-[6px] rounded-full bg-accent shadow-glow" />
              <span className="text-[12.5px] font-medium text-[#6FE9B7]">
                La meilleure réponse, pas juste une IA
              </span>
            </div>
            <h1 className="m-0 mb-[22px] text-[42px] font-bold leading-[1.02] tracking-[-0.04em] sm:text-[60px]">
              Un seul prompt.
              <br />
              <span className="bg-gradient-to-r from-accent via-[#7FF0C2] to-accent bg-clip-text text-transparent drop-shadow-[0_0_38px_rgba(43,245,168,.35)]">
                Le meilleur de plusieurs IA.
              </span>
            </h1>
            <p className="m-0 mb-[34px] max-w-[500px] text-[18.5px] leading-[1.55] text-muted-fg">
              Orsic interroge les meilleurs modèles en parallèle, compare leurs
              réponses, détecte les désaccords et vous rend une seule réponse
              claire — notée en confiance.
            </p>
            <div className="flex flex-wrap gap-[11px]">
              <Link
                href={startHref}
                className="inline-flex h-[52px] items-center gap-2 rounded-[13px] bg-primary px-[26px] text-[16px] font-semibold tracking-[-0.01em] text-primary-fg shadow-glow transition hover:opacity-90"
              >
                Poser ma première question →
              </Link>
              <a
                href="#how"
                className="glass-soft inline-flex h-[52px] items-center rounded-[13px] px-[22px] text-[16px] font-semibold text-foreground transition hover:brightness-125"
              >
                Voir comment ça marche
              </a>
            </div>
          </div>

          {/* Aperçu produit (bordure néon + flottement) */}
          <NeonBorder
            radius={18}
            className="animate-synth-float"
            innerClassName="overflow-hidden"
          >
            <div className="flex items-center gap-[7px] border-b border-white/[.06] px-4 py-[13px]">
              <span className="h-[9px] w-[9px] rounded-full bg-[#26342D]" />
              <span className="h-[9px] w-[9px] rounded-full bg-[#26342D]" />
              <span className="h-[9px] w-[9px] rounded-full bg-[#26342D]" />
              <span className="ml-2 font-mono text-[11px] text-faint">
                orsic.app/app
              </span>
            </div>
            <div className="px-[26px] pb-[28px] pt-[26px]">
              <div className="glass-soft mb-[18px] flex items-start gap-3 rounded-[13px] px-[18px] py-4">
                <span className="pt-[2px] font-mono text-[12px] text-faint">Q</span>
                <span className="text-[15px] text-[#C6D2CB]">
                  Quelle structure juridique pour lancer mon activité de freelance
                  ?
                </span>
              </div>
              <div className="mb-[14px] flex items-center gap-[9px]">
                <span className="glass-accent inline-flex items-center gap-[6px] rounded-full px-[11px] py-[5px] text-[12px] font-semibold text-[#4FE3A8]">
                  ● Confiance élevée
                </span>
                <span className="font-mono text-[11px] text-faint">
                  Synthétisée
                </span>
              </div>
              <p className="m-0 mb-2 text-[16px] font-semibold tracking-[-0.01em]">
                La micro-entreprise reste le meilleur point de départ.
              </p>
              <p className="m-0 text-[14.5px] leading-[1.6] text-muted-fg">
                Pour démarrer seul avec peu de charges, le statut de
                micro-entrepreneur offre la simplicité administrative et une
                fiscalité allégée.
              </p>
            </div>
          </NeonBorder>
        </header>

        {/* Problème → Solution (Avant / Après) */}
        <section className="px-0 pb-[30px] pt-6">
          <p className="m-0 mb-3 text-center font-mono text-[12px] tracking-[0.08em] text-[#4FE3A8]">
            LE PROBLÈME
          </p>
          <h2 className="m-0 mb-[40px] text-center text-[32px] font-bold tracking-[-0.03em]">
            Comparer les IA soi-même, c&apos;est du temps perdu.
          </h2>
          <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2">
            <div className="glass-soft rounded-xl p-7">
              <p className="m-0 mb-4 font-mono text-[12px] text-faint">SANS ORSIC</p>
              <p className="m-0 mb-4 text-[17px] font-semibold text-muted-fg">
                Vous jonglez entre les outils.
              </p>
              <div className="flex flex-col gap-[9px]">
                <div className="h-[11px] w-[90%] rounded-[5px] bg-white/[.06]" />
                <div className="h-[11px] w-[70%] rounded-[5px] bg-white/[.06]" />
                <div className="h-[11px] w-[82%] rounded-[5px] bg-white/[.06]" />
              </div>
              <p className="mb-0 mt-[18px] text-[14px] leading-[1.5] text-faint">
                Ouvrir plusieurs IA, copier-coller le même prompt, comparer,
                repérer les contradictions, choisir. Vous arbitrez seul.
              </p>
            </div>
            <NeonBorder radius={16} className="shadow-accent" innerClassName="p-7">
              <p className="m-0 mb-4 font-mono text-[12px] text-accent">AVEC ORSIC</p>
              <p className="m-0 mb-4 text-[17px] font-semibold">
                Une réponse. La bonne.
              </p>
              <div className="flex flex-col gap-[9px]">
                <div className="h-[11px] w-[95%] rounded-[5px] bg-primary shadow-glow" />
                <div className="h-[11px] w-[78%] rounded-[5px] bg-[#274038]" />
                <div className="h-[11px] w-[86%] rounded-[5px] bg-[#274038]" />
              </div>
              <p className="mb-0 mt-[18px] text-[14px] leading-[1.5] text-muted-fg">
                Orsic interroge, compare et arbitre à votre place. Vous lisez,
                vous décidez.
              </p>
            </NeonBorder>
          </div>
        </section>

        {/* Fonctionnement en 3 étapes */}
        <section id="how" className="px-0 pb-[30px] pt-16">
          <p className="m-0 mb-3 text-center font-mono text-[12px] tracking-[0.08em] text-[#4FE3A8]">
            COMMENT ÇA MARCHE
          </p>
          <h2 className="m-0 mb-[46px] text-center text-[34px] font-bold tracking-[-0.03em]">
            Une question. Plusieurs raisonnements. Un résultat clair.
          </h2>
          <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-3">
            {STEPS.map((s) => (
              <div
                key={s.n}
                className="glass rounded-xl p-[26px] transition duration-200 hover:-translate-y-1 hover:shadow-glow"
              >
                <div className="glass-accent mb-[18px] flex h-[38px] w-[38px] items-center justify-center rounded-[11px] text-[15px] font-bold text-accent">
                  {s.n}
                </div>
                <h3 className="m-0 mb-2 text-[17px] font-semibold tracking-[-0.01em]">
                  {s.title}
                </h3>
                <p className="m-0 text-[14.5px] leading-[1.55] text-muted-fg">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Gain de temps */}
        <section className="px-0 pb-[30px] pt-[54px]">
          <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-[1fr_1.1fr]">
            <div>
              <p className="m-0 mb-3 font-mono text-[12px] tracking-[0.08em] text-[#4FE3A8]">
                GAIN DE TEMPS
              </p>
              <h2 className="m-0 mb-4 text-[30px] font-bold leading-[1.1] tracking-[-0.03em]">
                Moins de copier-coller.
                <br />
                Plus de certitude.
              </h2>
              <p className="m-0 max-w-[440px] text-[16px] leading-[1.6] text-muted-fg">
                Orsic remplace un travail manuel fastidieux par une seule
                expérience fluide. Le plus court chemin vers une réponse fiable.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-[10px] sm:grid-cols-2">
              {TIME_SAVERS.map((item) => (
                <div
                  key={item}
                  className="glass-soft flex items-center gap-[10px] rounded-[12px] px-4 py-[13px]"
                >
                  <span className="text-accent">✓</span>
                  <span className="text-[14px] text-muted-fg">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Meilleure réponse (combinaison des forces) */}
        <section className="px-0 pb-[30px] pt-[54px]">
          <div className="glass rounded-2xl p-8 sm:p-10">
            <p className="m-0 mb-3 font-mono text-[12px] tracking-[0.08em] text-[#4FE3A8]">
              LA MEILLEURE RÉPONSE
            </p>
            <h2 className="m-0 mb-4 max-w-[640px] text-[28px] font-bold leading-[1.15] tracking-[-0.02em]">
              La meilleure réponse ne vient pas toujours du même modèle.
            </h2>
            <p className="m-0 max-w-[680px] text-[16px] leading-[1.6] text-muted-fg">
              Un modèle brille parfois sur la nuance, un autre sur la structure,
              un troisième apporte un angle inattendu. Orsic ne choisit pas votre
              camp : il rassemble ces forces et produit une réponse plus robuste,
              plus complète et plus utile qu&apos;une seule intelligence isolée.
            </p>
          </div>
        </section>

        {/* Désaccords & confiance */}
        <section className="grid grid-cols-1 gap-[18px] px-0 pb-[30px] pt-[54px] sm:grid-cols-3">
          {[
            {
              t: "Quand les modèles s'accordent",
              b: "Orsic renforce la confiance : la réponse est solide, vous avancez sereinement.",
            },
            {
              t: "Quand ils divergent",
              b: "Orsic vous montre où, au lieu de masquer l'incertitude derrière une réponse unique.",
            },
            {
              t: "Quand une piste est fragile",
              b: "Orsic le signale, avec un niveau de confiance clair : élevé, modéré ou à vérifier.",
            },
          ].map((c) => (
            <div key={c.t} className="glass-soft rounded-xl p-6">
              <h3 className="m-0 mb-2 text-[16px] font-semibold tracking-[-0.01em]">
                {c.t}
              </h3>
              <p className="m-0 text-[14.5px] leading-[1.55] text-muted-fg">
                {c.b}
              </p>
            </div>
          ))}
        </section>

        {/* Fonctionnalités */}
        <section className="px-0 pb-[30px] pt-[54px]">
          <h2 className="m-0 mb-[36px] text-[28px] font-bold tracking-[-0.02em]">
            Tout ce qu&apos;une seule IA ne fait pas.
          </h2>
          <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="glass rounded-xl p-6 transition duration-200 hover:-translate-y-1 hover:shadow-glow"
              >
                <div className="mb-[14px]">
                  <Diamond size={13} />
                </div>
                <h3 className="m-0 mb-2 text-[16px] font-semibold tracking-[-0.01em]">
                  {f.title}
                </h3>
                <p className="m-0 text-[14px] leading-[1.55] text-muted-fg">
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Comparaison Orsic vs IA classique */}
        <section className="px-0 pb-[30px] pt-[54px]">
          <h2 className="m-0 mb-[36px] text-center text-[28px] font-bold tracking-[-0.02em]">
            Orsic, ou une seule IA ?
          </h2>
          <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2">
            <div className="glass-soft rounded-xl p-6">
              <p className="m-0 mb-5 font-mono text-[12px] text-faint">
                UNE IA CLASSIQUE
              </p>
              <ul className="m-0 flex list-none flex-col gap-[12px] p-0">
                {COMPARISON.map(([left]) => (
                  <li
                    key={left}
                    className="flex items-center gap-[10px] text-[14.5px] text-muted-fg"
                  >
                    <span className="text-faint">✕</span> {left}
                  </li>
                ))}
              </ul>
            </div>
            <NeonBorder radius={16} className="shadow-accent" innerClassName="p-6">
              <p className="m-0 mb-5 font-mono text-[12px] text-accent">ORSIC</p>
              <ul className="m-0 flex list-none flex-col gap-[12px] p-0">
                {COMPARISON.map(([, right]) => (
                  <li
                    key={right}
                    className="flex items-center gap-[10px] text-[14.5px] text-foreground"
                  >
                    <span className="text-accent">✓</span> {right}
                  </li>
                ))}
              </ul>
            </NeonBorder>
          </div>
        </section>

        {/* Cas d'usage (défilement) */}
        <section className="px-0 pb-[30px] pt-[54px]">
          <h2 className="m-0 mb-[22px] text-[24px] font-bold tracking-[-0.02em]">
            Pour tous ceux qui doivent décider vite et bien.
          </h2>
          <div className="marquee-mask overflow-hidden">
            <div className="animate-synth-marquee flex w-max gap-3">
              {[...USE_CASES, ...USE_CASES].map((ex, i) => (
                <div
                  key={i}
                  className="glass-soft w-[340px] shrink-0 rounded-[13px] px-5 py-[18px] text-[14.5px] leading-[1.5] text-muted-fg"
                >
                  {ex}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="my-[50px]">
          <NeonBorder
            radius={22}
            className="shadow-accent"
            innerClassName="px-8 py-[54px] text-center"
          >
            <h2 className="m-0 mb-3 text-[34px] font-bold tracking-[-0.03em] text-foreground">
              Une seule question.
              <br />
              <span className="bg-gradient-to-r from-accent to-[#7FF0C2] bg-clip-text text-transparent drop-shadow-[0_0_22px_rgba(43,245,168,.35)]">
                Le meilleur de plusieurs IA.
              </span>
            </h2>
            <p className="mx-auto mb-7 max-w-[440px] text-[16px] text-muted-fg">
              Gratuit pour vos premières questions. Aucune carte requise.
            </p>
            <Link
              href={startHref}
              className="inline-flex h-[50px] items-center rounded-xl bg-primary px-7 text-[16px] font-semibold tracking-[-0.01em] text-primary-fg shadow-glow transition hover:opacity-90"
            >
              Demander à Orsic
            </Link>
          </NeonBorder>
        </section>

        {/* Footer */}
        <footer className="flex flex-wrap items-center justify-between gap-[14px] border-t border-white/[.06] py-[30px] pb-12">
          <div className="flex items-center gap-2">
            <Diamond size={11} />
            <span className="text-[14px] font-semibold">Orsic</span>
            <span className="text-[13px] text-faint">
              — La meilleure réponse, pas juste une IA.
            </span>
          </div>
          <div className="flex gap-5 text-[13.5px] text-muted-fg">
            <span>Confidentialité</span>
            <span>Conditions</span>
            <span>Contact</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
