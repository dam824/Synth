import Link from "next/link";

import { auth } from "@/auth";
import { Logo, ThemisMark } from "@/components/brand";
import { HomeFaq } from "@/components/home-faq";
import { HomeMotion } from "@/components/home-motion";
import { SiteIntro } from "@/components/site-intro";
import { NeonBorder } from "@/components/neon-border";
import { SITE_CONFIG } from "@/config/site";

// Étapes de fonctionnement.
const STEPS = [
  {
    n: "1",
    title: "Posez votre question",
    body: "Décrivez votre situation naturellement. Aucun modèle à choisir, aucun réglage technique.",
  },
  {
    n: "2",
    title: `${SITE_CONFIG.name} confronte plusieurs IA`,
    body: "Plusieurs modèles analysent votre demande indépendamment. Leurs convergences et divergences sont comparées.",
  },
  {
    n: "3",
    title: "Recevez une réponse consolidée",
    body: "Une synthèse unique, ses points clés, les désaccords utiles et un indicateur de convergence.",
  },
];

// Lecture en trois niveaux.
const READINGS = [
  {
    t: "Ce qui fait consensus",
    b: "Les éléments sur lesquels les analyses convergent sont réunis clairement.",
  },
  {
    t: "Ce qui mérite votre attention",
    b: "Les divergences importantes restent visibles au lieu d'être masquées.",
  },
  {
    t: "Ce qu'il faut encore vérifier",
    b: `Lorsqu'un point reste fragile ou dépend d'informations manquantes, ${SITE_CONFIG.name} le signale.`,
  },
];

// Cas d'usage (profils).
const USE_CASES = [
  {
    tag: "Consultants & freelances",
    title: "Livrez des recommandations déjà confrontées.",
    body: "Confrontez une analyse ou une recommandation avant de la transmettre à un client. Les angles morts apparaissent avant la livraison, pas après.",
  },
  {
    tag: "Dirigeants & entrepreneurs",
    title: "Décidez avec les risques sur la table.",
    body: "Faites ressortir les risques, les hypothèses et les options avant une décision commerciale, marketing ou opérationnelle.",
  },
  {
    tag: "Rédacteurs & créateurs",
    title: "Partez d'une synthèse déjà croisée.",
    body: "Croisez plusieurs angles dès la première demande et réduisez les réécritures.",
  },
];

// Bénéfices (6 blocs).
const BENEFITS = [
  {
    title: "Une seule demande à rédiger",
    body: "Distribuée aux meilleurs modèles. Vous n'écrivez qu'une fois.",
  },
  {
    title: "Aucun modèle à sélectionner",
    body: "Vos questions sont traitées simultanément par plusieurs modèles de premier plan.",
  },
  {
    title: "Plusieurs analyses confrontées",
    body: `${SITE_CONFIG.name} confronte les réponses, repère les convergences et filtre le bruit.`,
  },
  {
    title: "Désaccords importants visibles",
    body: `Quand les modèles divergent, ${SITE_CONFIG.name} le montre au lieu de masquer l'incertitude.`,
  },
  {
    title: "Synthèse prête à retravailler",
    body: "Sauvegardez, exportez ou repartez de la synthèse consolidée.",
  },
  {
    title: "Coût annoncé avant l'exécution",
    body: "Chaque tâche affiche son coût maximal avant de lancer. Aucun dépassement sans confirmation.",
  },
];

// Confiance & transparence (6 cellules).
const TRUST = [
  {
    t: "Données chiffrées au repos",
    b: "Vos questions et synthèses sont stockées chiffrées.",
  },
  {
    t: "Historique contrôlable",
    b: "Consultez, exportez ou supprimez vos échanges quand vous le souhaitez.",
  },
  {
    t: "Modèles utilisés indiqués",
    b: "Chaque synthèse précise quels modèles ont contribué à l'analyse.",
  },
  {
    t: "Divergences transparentes",
    b: "Les désaccords entre modèles sont montrés, pas lissés.",
  },
  {
    t: "Coûts visibles",
    b: "Le coût maximal est affiché avant chaque exécution.",
  },
  {
    t: "Aucun quota caché",
    b: "Vos crédits, leur usage et leur solde sont consultables à tout moment.",
  },
];

export default async function HomePage() {
  const session = await auth();
  const startHref = session?.user ? "/app" : "/login";

  return (
    <div className="home-motion relative min-h-screen overflow-hidden">
      <SiteIntro />
      <HomeMotion />
      <div className="synth-orbs" />

      <div className="synth-scroll relative z-10 mx-auto max-w-[1200px] px-6">
        {/* ============ NAV ============ */}
        <nav className="glass sticky top-4 z-30 mt-5 flex items-center justify-between rounded-2xl py-[11px] pl-[18px] pr-3">
          <Link href="/" aria-label={`Accueil ${SITE_CONFIG.name}`} data-home-logo>
            <Logo />
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <a
              href="#comment"
              className="hidden h-[38px] items-center rounded-[10px] px-[14px] text-[14px] font-medium text-muted-fg transition hover:bg-white/[.05] hover:text-foreground md:flex"
            >
              Comment ça marche
            </a>
            <Link
              href="/tarifs"
              className="hidden h-[38px] items-center rounded-[10px] px-[14px] text-[14px] font-medium text-muted-fg transition hover:bg-white/[.05] hover:text-foreground sm:flex"
            >
              Tarifs
            </Link>
            <a
              href="#faq"
              className="hidden h-[38px] items-center rounded-[10px] px-[14px] text-[14px] font-medium text-muted-fg transition hover:bg-white/[.05] hover:text-foreground md:flex"
            >
              FAQ
            </a>
            <Link
              href={startHref}
              className="glass-accent flex h-[38px] items-center rounded-[10px] px-4 text-[14px] font-semibold tracking-[-0.01em] text-[#7FF0C2] transition hover:brightness-110"
            >
              Essayer {SITE_CONFIG.name}
            </Link>
          </div>
        </nav>

        {/* ============ HERO ============ */}
        <header
          id="top"
          className="relative grid grid-cols-1 items-center gap-14 py-[80px] md:grid-cols-[1.05fr_.95fr] md:py-[96px]"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-28 h-[560px] w-[560px] rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(43,245,168,0.09) 0%, rgba(43,245,168,0.03) 40%, transparent 68%)",
            }}
          />

          <div className="relative" data-hero-copy>
            <div className="glass-accent inline-flex items-center gap-[9px] rounded-full px-4 py-2">
              <span className="animate-synth-glow h-[6px] w-[6px] rounded-full bg-accent shadow-glow" />
              <span className="text-[14px] text-[#7FF0C2]">
                Une question, plusieurs analyses
              </span>
            </div>

            <h1 className="m-0 mt-[26px] text-[44px] font-extrabold leading-[1.02] tracking-[-0.035em] sm:text-[64px]">
              Une question importante{" "}
              <span className="bg-gradient-to-r from-accent to-[#7FF0C2] bg-clip-text text-transparent">
                mérite plusieurs avis.
              </span>
            </h1>

            <p className="m-0 mt-[26px] max-w-[520px] text-[18px] leading-[1.7] text-muted-fg">
              {SITE_CONFIG.name} confronte plusieurs modèles d&apos;IA, repère
              leurs désaccords et rassemble leurs analyses dans une réponse
              consolidée, avec les points à retenir et les incertitudes à
              connaître.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-[14px]">
              <Link
                href={startHref}
                className="inline-flex items-center gap-[10px] rounded-[14px] bg-primary px-7 py-4 text-[16px] font-bold text-primary-fg shadow-glow transition hover:brightness-110 hover:-translate-y-px"
              >
                Poser ma première question <span aria-hidden>→</span>
              </Link>
              <a
                href="#comment"
                className="rounded-[14px] border border-white/[.18] px-[26px] py-4 text-[16px] font-semibold text-foreground transition hover:border-accent/45"
              >
                Voir {SITE_CONFIG.name} en action
              </a>
            </div>
            <p className="m-0 mt-4 font-mono text-[13.5px] text-faint">
              Sans carte bancaire
            </p>
          </div>

          {/* Panneau démo */}
          <div data-hero-panel>
          <NeonBorder
            radius={20}
            className="animate-synth-float"
            innerClassName="overflow-hidden"
          >
            <div className="flex items-center gap-[14px] border-b border-white/[.06] px-[18px] py-[14px]">
              <div className="flex gap-[6px]">
                <span className="h-[9px] w-[9px] rounded-full bg-[#26342D]" />
                <span className="h-[9px] w-[9px] rounded-full bg-[#26342D]" />
                <span className="h-[9px] w-[9px] rounded-full bg-[#26342D]" />
              </div>
              <span className="font-mono text-[12.5px] tracking-[0.04em] text-faint">
                {SITE_CONFIG.domain}/app
              </span>
            </div>
            <div className="px-[22px] pb-6 pt-[22px]">
              <div id="hero-q" className="glass-soft flex items-start gap-[10px] rounded-[12px] px-4 py-[14px]">
                <span className="mt-[2px] font-mono text-[13px] text-accent">Q</span>
                <span className="text-[15px] leading-[1.5] text-foreground">
                  Quels risques dois-je anticiper avant d&apos;augmenter mes
                  tarifs de 15&nbsp;% ?
                </span>
              </div>

              {/* Trajectoires : question → 3 modèles → synthèse */}
              <svg
                viewBox="0 0 440 150"
                className="my-1 block h-auto w-full"
                aria-hidden
              >
                <path className="tra-path tra-split" d="M220 6 C220 30 90 30 90 52" stroke="rgba(127,240,194,0.5)" strokeWidth="1.5" fill="none" />
                <path className="tra-path tra-split" d="M220 6 C220 30 220 30 220 52" stroke="rgba(127,240,194,0.5)" strokeWidth="1.5" fill="none" />
                <path className="tra-path tra-split" d="M220 6 C220 30 350 30 350 52" stroke="rgba(127,240,194,0.5)" strokeWidth="1.5" fill="none" />
                <g className="model-chip">
                  <rect x="42" y="52" width="96" height="26" rx="8" fill="rgba(43,245,168,0.06)" stroke="rgba(43,245,168,0.28)" />
                  <text x="90" y="69" textAnchor="middle" fontFamily="monospace" fontSize="11" fill="#7FF0C2">MODÈLE A</text>
                </g>
                <g className="model-chip">
                  <rect x="172" y="52" width="96" height="26" rx="8" fill="rgba(43,245,168,0.06)" stroke="rgba(43,245,168,0.28)" />
                  <text x="220" y="69" textAnchor="middle" fontFamily="monospace" fontSize="11" fill="#7FF0C2">MODÈLE B</text>
                </g>
                <g className="model-chip">
                  <rect x="302" y="52" width="96" height="26" rx="8" fill="rgba(43,245,168,0.06)" stroke="rgba(43,245,168,0.28)" />
                  <text x="350" y="69" textAnchor="middle" fontFamily="monospace" fontSize="11" fill="#7FF0C2">MODÈLE C</text>
                </g>
                <path className="tra-path tra-merge" d="M90 78 C90 108 205 106 216 126" stroke="rgba(43,245,168,0.75)" strokeWidth="1.6" fill="none" />
                <path className="tra-path tra-merge" d="M220 78 C220 100 220 108 220 122" stroke="rgba(43,245,168,0.75)" strokeWidth="1.6" fill="none" />
                <path className="tra-path tra-merge tra-dissent" d="M350 78 C350 104 250 100 232 118" stroke="rgba(127,240,194,0.4)" strokeWidth="1.4" strokeDasharray="4 5" fill="none" />
                <g id="hero-diamond">
                  <rect x="212" y="122" width="16" height="16" rx="3" transform="rotate(45 220 130)" fill="#2BF5A8" />
                  <rect x="206" y="116" width="28" height="28" rx="6" transform="rotate(45 220 130)" fill="none" stroke="rgba(43,245,168,0.35)" />
                </g>
              </svg>

              <div id="hero-answer">
                <div className="mb-3 flex items-center gap-3">
                  <span id="hero-badge" className="glass-accent inline-flex items-center gap-2 rounded-full px-[13px] py-[6px] text-[12.5px] font-semibold text-accent">
                    <span className="h-[6px] w-[6px] rounded-full bg-accent" />
                    Convergence forte
                  </span>
                  <span className="font-mono text-[12px] tracking-[0.08em] text-faint">
                    SYNTHÉTISÉE
                  </span>
                </div>
                <p className="m-0 mb-2 text-[16.5px] font-bold text-foreground">
                  Une hausse progressive limite le risque de départ.
                </p>
                <p className="m-0 text-[14.5px] leading-[1.65] text-muted-fg">
                  Les analyses convergent sur une hausse par étapes, mais
                  divergent sur la manière de la présenter aux clients existants.
                </p>
              </div>
            </div>
          </NeonBorder>
          </div>
        </header>

        {/* ============ LE PROBLÈME ============ */}
        <section className="py-[60px]">
          <div data-reveal className="mx-auto max-w-[820px] text-center">
            <p className="m-0 font-mono text-[13px] tracking-[0.2em] text-accent">
              POURQUOI {SITE_CONFIG.name.toUpperCase()}
            </p>
            <h2 className="m-0 mt-[18px] text-[30px] font-bold leading-[1.15] tracking-[-0.025em] sm:text-[44px]">
              Vous n&apos;avez pas besoin d&apos;une réponse de plus. Vous avez
              besoin de savoir laquelle retenir.
            </h2>
          </div>

          <div id="probleme-visu" className="mt-16 grid grid-cols-1 items-stretch gap-7 md:grid-cols-2">
            <div className="prob-card glass-soft rounded-[18px] p-[30px]">
              <p className="m-0 font-mono text-[12.5px] tracking-[0.16em] text-faint">
                SANS {SITE_CONFIG.name.toUpperCase()}
              </p>
              <h3 className="m-0 mb-[18px] mt-[14px] text-[23px] font-bold">
                Vous jonglez entre les outils.
              </h3>
              <div className="flex flex-col gap-[10px]">
                <div className="glass-soft rounded-[11px] px-4 py-[13px] text-[14px] text-muted-fg [transform:rotate(-1deg)]">
                  Réponse A — « Augmentez d&apos;un coup, assumez. »
                </div>
                <div className="glass-soft rounded-[11px] px-4 py-[13px] text-[14px] text-muted-fg [transform:rotate(0.8deg)_translateX(10px)]">
                  Réponse B — « Procédez par paliers de 5 %. »
                </div>
                <div className="glass-soft rounded-[11px] px-4 py-[13px] text-[14px] text-muted-fg [transform:rotate(-0.6deg)_translateX(-6px)]">
                  Réponse C — « Attendez le prochain trimestre. »
                </div>
              </div>
              <p className="m-0 mt-[18px] text-[14.5px] leading-[1.65] text-muted-fg">
                Trois onglets, trois avis, et les contradictions restent à
                repérer à la main.
              </p>
            </div>

            <NeonBorder radius={18} className="prob-card shadow-accent" innerClassName="p-[30px]">
              <p className="m-0 font-mono text-[12.5px] tracking-[0.16em] text-accent">
                AVEC {SITE_CONFIG.name.toUpperCase()}
              </p>
              <h3 className="m-0 mb-[18px] mt-[14px] text-[23px] font-bold">
                Une réponse consolidée.
              </h3>
              <div className="rounded-[12px] border border-accent/20 bg-accent/[.04] px-[18px] py-4">
                <p className="m-0 mb-2 text-[15px] font-semibold text-foreground">
                  Hausse progressive recommandée.
                </p>
                <p className="m-0 text-[13.5px] leading-[1.6] text-muted-fg">
                  Consensus sur le principe · divergence sur la communication aux
                  clients existants · un point à vérifier sur votre positionnement
                  prix.
                </p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-accent/30 px-3 py-[6px] text-[12.5px] text-[#7FF0C2]">
                  Accords réunis
                </span>
                <span className="rounded-full border border-white/[.18] px-3 py-[6px] text-[12.5px] text-muted-fg">
                  Désaccords visibles
                </span>
                <span className="rounded-full border border-white/[.18] px-3 py-[6px] text-[12.5px] text-muted-fg">
                  Points à vérifier
                </span>
              </div>
              <p className="m-0 mt-[18px] text-[14.5px] leading-[1.65] text-muted-fg">
                Le travail de comparaison est fait, les nuances restent visibles.
              </p>
            </NeonBorder>
          </div>
        </section>

        {/* ============ COMMENT ÇA MARCHE ============ */}
        <section id="comment" className="py-[80px]">
          <div data-reveal className="text-center">
            <p className="m-0 font-mono text-[13px] tracking-[0.2em] text-accent">
              COMMENT ÇA MARCHE
            </p>
            <h2 className="m-0 mt-[18px] text-[30px] font-bold tracking-[-0.025em] sm:text-[44px]">
              Plusieurs analyses. Une synthèse claire.
            </h2>
          </div>

          <div className="relative mt-[70px]">
            <div className="relative grid grid-cols-1 gap-7 sm:grid-cols-3">
              {STEPS.map((s) => (
                <div
                  key={s.n}
                  data-reveal
                  className="glass relative rounded-[18px] px-7 pb-[30px] pt-14 transition duration-200 hover:-translate-y-1 hover:shadow-glow"
                >
                  <span className="glass-accent absolute left-7 top-2 inline-flex h-[34px] w-[34px] items-center justify-center rounded-[10px] font-mono text-[14px] text-accent">
                    {s.n}
                  </span>
                  <h3 className="m-0 mb-[10px] text-[20px] font-bold">{s.title}</h3>
                  <p className="m-0 text-[15px] leading-[1.65] text-muted-fg">
                    {s.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============ ACCORDS ET DÉSACCORDS ============ */}
        <section className="py-[80px]">
          <div data-reveal className="max-w-[700px]">
            <p className="m-0 font-mono text-[13px] tracking-[0.2em] text-accent">
              LECTURE EN TROIS NIVEAUX
            </p>
            <h2 className="m-0 mt-[18px] text-[30px] font-bold tracking-[-0.025em] sm:text-[44px]">
              L&apos;accord compte. Le désaccord aussi.
            </h2>
          </div>
          <div className="mt-14 grid grid-cols-1 gap-7 sm:grid-cols-3">
            {READINGS.map((c, i) => (
              <div
                key={c.t}
                data-reveal
                className="rounded-[18px] border border-accent/[.14] bg-gradient-to-b from-[#0D1713] to-[#09110E] p-7 transition hover:-translate-y-1 hover:border-accent/35"
              >
                <svg viewBox="0 0 220 70" className="mb-5 block h-auto w-full" aria-hidden>
                  {i === 0 ? (
                    <>
                      <path className="acc-line" d="M8 14 C90 14 150 33 212 35" stroke="#2BF5A8" strokeWidth="1.8" fill="none" />
                      <path className="acc-line" d="M8 35 C90 35 150 35 212 35" stroke="#7FF0C2" strokeWidth="1.8" fill="none" />
                      <path className="acc-line" d="M8 56 C90 56 150 37 212 35" stroke="#2BF5A8" strokeWidth="1.8" fill="none" />
                      <circle cx="212" cy="35" r="4" fill="#2BF5A8" />
                    </>
                  ) : i === 1 ? (
                    <>
                      <path className="acc-line" d="M8 30 C90 30 150 14 212 12" stroke="#7FF0C2" strokeWidth="1.8" fill="none" />
                      <path className="acc-line" d="M8 38 C90 38 150 55 212 58" stroke="#2BF5A8" strokeWidth="1.8" fill="none" />
                      <circle cx="212" cy="12" r="4" fill="#7FF0C2" />
                      <circle cx="212" cy="58" r="4" fill="#2BF5A8" />
                    </>
                  ) : (
                    <>
                      <path className="acc-line" d="M8 24 C90 24 150 30 212 32" stroke="rgba(127,240,194,0.45)" strokeWidth="1.8" strokeDasharray="5 6" fill="none" />
                      <path className="acc-line" d="M8 46 C90 46 150 40 212 38" stroke="rgba(147,163,155,0.5)" strokeWidth="1.8" strokeDasharray="3 7" fill="none" />
                      <circle cx="212" cy="35" r="4" fill="none" stroke="#7FF0C2" strokeWidth="1.5" />
                    </>
                  )}
                </svg>
                <h3 className="m-0 mb-[10px] text-[19px] font-bold">{c.t}</h3>
                <p className="m-0 text-[14.5px] leading-[1.65] text-muted-fg">
                  {c.b}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ============ APERÇU DU PRODUIT ============ */}
        <section className="py-[80px]">
          <div data-reveal className="mx-auto mb-14 max-w-[760px] text-center">
            <p className="m-0 font-mono text-[13px] tracking-[0.2em] text-accent">
              L&apos;APPLICATION
            </p>
            <h2 className="m-0 mt-[18px] text-[30px] font-bold tracking-[-0.025em] sm:text-[44px]">
              Un seul modèle ne voit pas toujours tous les angles.
            </h2>
            <p className="m-0 mt-5 text-[16.5px] leading-[1.7] text-muted-fg">
              Un modèle brille parfois sur la nuance, un autre sur la structure,
              un troisième apporte un angle inattendu. {SITE_CONFIG.name}{" "}
              rassemble ces analyses, fait ressortir leurs accords et conserve
              les divergences utiles au lieu de les masquer.
            </p>
          </div>

          <div data-reveal className="mx-auto max-w-[980px]">
          <NeonBorder radius={22} innerClassName="overflow-hidden">
            <div className="flex items-center gap-[14px] border-b border-white/[.06] px-5 py-[15px]">
              <div className="flex gap-[6px]">
                <span className="h-[9px] w-[9px] rounded-full bg-[#26342D]" />
                <span className="h-[9px] w-[9px] rounded-full bg-[#26342D]" />
                <span className="h-[9px] w-[9px] rounded-full bg-[#26342D]" />
              </div>
              <span className="font-mono text-[12.5px] text-faint">
                {SITE_CONFIG.domain}/app — synthèse
              </span>
            </div>
            <div className="grid grid-cols-1 gap-7 p-7 md:grid-cols-[0.9fr_1.1fr]">
              <div className="flex flex-col gap-[14px]">
                <div className="glass-soft rounded-[12px] px-[17px] py-[15px]">
                  <p className="m-0 mb-[6px] font-mono text-[11px] tracking-[0.14em] text-faint">
                    VOTRE QUESTION
                  </p>
                  <p className="m-0 text-[14.5px] leading-[1.55] text-foreground">
                    Quels risques dois-je anticiper avant d&apos;augmenter mes
                    tarifs de 15 % ?
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  {["MODÈLE A", "MODÈLE B", "MODÈLE C"].map((m) => (
                    <div
                      key={m}
                      className="flex items-center justify-between rounded-[10px] border border-accent/[.18] bg-accent/[.03] px-[15px] py-[11px]"
                    >
                      <span className="font-mono text-[12px] text-[#7FF0C2]">{m}</span>
                      <span className="text-[12.5px] text-accent">
                        ✓ analyse terminée
                      </span>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-mono text-[11px] tracking-[0.14em] text-faint">
                      CONVERGENCE
                    </span>
                    <span className="text-[13px] font-semibold text-accent">Forte</span>
                  </div>
                  <div className="h-[6px] overflow-hidden rounded-full bg-white/[.08]">
                    <div id="conv-fill" className="h-full w-[82%] origin-left rounded-full bg-gradient-to-r from-accent to-[#7FF0C2]" />
                  </div>
                </div>
              </div>

              <div className="rounded-[14px] border border-accent/20 bg-accent/[.03] px-[22px] py-5">
                <div className="mb-[14px] flex items-center gap-[10px]">
                  <span className="glass-accent inline-flex items-center gap-[7px] rounded-full px-3 py-[5px] text-[12px] font-semibold text-accent">
                    <span className="h-[6px] w-[6px] rounded-full bg-accent" />
                    Réponse consolidée
                  </span>
                </div>
                <p className="m-0 mb-[14px] text-[16px] font-bold leading-[1.45] text-foreground">
                  Les analyses convergent sur une hausse progressive, mais
                  divergent sur la manière de la présenter aux clients existants.
                </p>
                <div className="flex flex-col gap-[9px] text-[13.5px] leading-[1.55] text-muted-fg">
                  <p className="m-0 flex gap-[10px]">
                    <span className="text-accent">◆</span>
                    <span>
                      <strong className="font-semibold text-foreground">Point clé</strong> —
                      échelonner la hausse limite le risque de départ des clients
                      sensibles au prix.
                    </span>
                  </p>
                  <p className="m-0 flex gap-[10px]">
                    <span className="text-accent">◆</span>
                    <span>
                      <strong className="font-semibold text-foreground">Point clé</strong> —
                      annoncer la hausse avec un préavis renforce la confiance.
                    </span>
                  </p>
                  <p className="m-0 flex gap-[10px]">
                    <span className="text-[#7FF0C2]">◇</span>
                    <span>
                      <strong className="font-semibold text-foreground">Divergence</strong> —
                      grandfathering des clients existants : recommandé par deux
                      analyses, déconseillé par une.
                    </span>
                  </p>
                  <p className="m-0 flex gap-[10px]">
                    <span className="text-faint">○</span>
                    <span>
                      <strong className="font-semibold text-foreground">À vérifier</strong> —
                      votre position tarifaire réelle face aux concurrents
                      directs.
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </NeonBorder>
          </div>
        </section>

        {/* ============ CAS D'USAGE ============ */}
        <section className="py-[80px]">
          <div data-reveal className="max-w-[700px]">
            <p className="m-0 font-mono text-[13px] tracking-[0.2em] text-accent">
              CAS D&apos;USAGE
            </p>
            <h2 className="m-0 mt-[18px] text-[30px] font-bold tracking-[-0.025em] sm:text-[44px]">
              Pour les questions que vous comptez réellement utiliser.
            </h2>
          </div>
          <div className="mt-14 grid grid-cols-1 gap-7 sm:grid-cols-3">
            {USE_CASES.map((c) => (
              <div
                key={c.tag}
                data-reveal
                className="rounded-[18px] border border-accent/[.12] bg-gradient-to-b from-[#0D1713] to-[#09110E] p-[30px] transition duration-200 hover:-translate-y-1 hover:border-accent/35 hover:shadow-card"
              >
                <p className="m-0 mb-[14px] font-mono text-[12px] tracking-[0.16em] text-[#7FF0C2]">
                  {c.tag}
                </p>
                <h3 className="m-0 mb-3 text-[20px] font-bold leading-[1.3]">
                  {c.title}
                </h3>
                <p className="m-0 text-[14.5px] leading-[1.65] text-muted-fg">
                  {c.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ============ BÉNÉFICES ============ */}
        <section className="py-[80px]">
          <div data-reveal className="max-w-[700px]">
            <p className="m-0 font-mono text-[13px] tracking-[0.2em] text-accent">
              GAIN DE TEMPS
            </p>
            <h2 className="m-0 mt-[18px] text-[30px] font-bold tracking-[-0.025em] sm:text-[44px]">
              Le travail de comparaison, sans les trois onglets.
            </h2>
          </div>
          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map((f) => (
              <div
                key={f.title}
                data-reveal
                className="glass-soft rounded-[16px] p-[26px] transition duration-200 hover:-translate-y-1 hover:shadow-glow"
              >
                <span className="mb-4 inline-block h-[11px] w-[11px] rotate-45 rounded-[2px] bg-accent" />
                <h3 className="m-0 mb-2 text-[17.5px] font-bold">{f.title}</h3>
                <p className="m-0 text-[14px] leading-[1.6] text-muted-fg">
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ============ TARIFS (teaser → /tarifs) ============ */}
        <section id="tarifs" className="py-[80px]">
          <div data-reveal>
          <NeonBorder radius={24} className="shadow-accent" innerClassName="px-8 py-12 sm:px-12">
            <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-[1.1fr_.9fr]">
              <div>
                <p className="m-0 font-mono text-[13px] tracking-[0.2em] text-accent">
                  TARIFS
                </p>
                <h2 className="m-0 mt-[18px] text-[30px] font-bold tracking-[-0.025em] sm:text-[40px]">
                  Des réponses consolidées. Des règles claires.
                </h2>
                <p className="m-0 mt-5 max-w-[520px] text-[16px] leading-[1.7] text-muted-fg">
                  Chaque formule inclut un budget mensuel de crédits. Avant chaque
                  tâche, vous connaissez son coût maximal — aucun dépassement sans
                  votre confirmation.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-[14px]">
                  <Link
                    href="/tarifs"
                    className="inline-flex items-center gap-[10px] rounded-[14px] bg-primary px-7 py-[15px] text-[15px] font-bold text-primary-fg shadow-glow transition hover:brightness-110"
                  >
                    Voir les tarifs <span aria-hidden>→</span>
                  </Link>
                  <Link
                    href={startHref}
                    className="rounded-[14px] border border-white/[.18] px-6 py-[15px] text-[15px] font-semibold text-foreground transition hover:border-accent/45"
                  >
                    Commencer gratuitement
                  </Link>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {[
                  { name: "Découverte", price: "0 €", note: "100 crédits offerts" },
                  { name: "Essentiel", price: "14,90 €", note: "1 200 crédits / mois" },
                  { name: "Pro", price: "29,90 €", note: "3 000 crédits / mois", featured: true },
                ].map((p) => (
                  <div
                    key={p.name}
                    className={`flex items-center justify-between rounded-[14px] px-5 py-4 ${
                      p.featured
                        ? "border border-accent/50 bg-accent/[.05] shadow-glow"
                        : "glass-soft"
                    }`}
                  >
                    <div>
                      <p className="m-0 text-[16px] font-bold">{p.name}</p>
                      <p className="m-0 text-[13px] text-[#7FF0C2]">{p.note}</p>
                    </div>
                    <p className="m-0 text-[22px] font-extrabold tracking-[-0.02em]">
                      {p.price}
                    </p>
                  </div>
                ))}
                <p className="m-0 mt-1 text-center text-[12.5px] text-faint">
                  Sans engagement · Résiliable à tout moment
                </p>
              </div>
            </div>
          </NeonBorder>
          </div>
        </section>

        {/* ============ CONFIANCE & TRANSPARENCE ============ */}
        <section className="py-[80px]">
          <div data-reveal className="max-w-[720px]">
            <p className="m-0 font-mono text-[13px] tracking-[0.2em] text-accent">
              CONFIANCE &amp; TRANSPARENCE
            </p>
            <h2 className="m-0 mt-[18px] text-[30px] font-bold tracking-[-0.025em] sm:text-[44px]">
              Vous savez ce qui est envoyé, à qui et pourquoi.
            </h2>
          </div>
          <div className="mt-14 grid grid-cols-1 gap-[2px] overflow-hidden rounded-[18px] border border-white/[.1] sm:grid-cols-2 lg:grid-cols-3">
            {TRUST.map((c) => (
              <div key={c.t} data-reveal className="bg-[#09110E] p-7">
                <h3 className="m-0 mb-2 text-[16.5px] font-bold">{c.t}</h3>
                <p className="m-0 text-[14px] leading-[1.6] text-muted-fg">
                  {c.b}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ============ FAQ ============ */}
        <section id="faq" className="mx-auto max-w-[860px] py-[80px]">
          <div data-reveal className="mb-12 text-center">
            <p className="m-0 font-mono text-[13px] tracking-[0.2em] text-accent">
              FAQ
            </p>
            <h2 className="m-0 mt-[18px] text-[30px] font-bold tracking-[-0.025em] sm:text-[44px]">
              Questions fréquentes
            </h2>
          </div>
          <HomeFaq />
        </section>

        {/* ============ CTA FINAL ============ */}
        <section id="final" className="py-[60px]">
          <NeonBorder radius={26} className="shadow-accent" innerClassName="relative overflow-hidden px-8 py-20 text-center sm:py-24">
            <svg
              viewBox="0 0 1000 300"
              preserveAspectRatio="none"
              aria-hidden
              className="pointer-events-none absolute inset-0 h-full w-full opacity-50"
            >
              <path className="final-path" d="M0 30 C300 60 420 130 500 150" stroke="rgba(43,245,168,0.5)" strokeWidth="1.4" fill="none" />
              <path className="final-path" d="M1000 30 C700 60 580 130 500 150" stroke="rgba(127,240,194,0.4)" strokeWidth="1.4" fill="none" />
              <path className="final-path" d="M0 270 C300 240 420 170 500 150" stroke="rgba(127,240,194,0.4)" strokeWidth="1.4" fill="none" />
              <path className="final-path" d="M1000 270 C700 240 580 170 500 150" stroke="rgba(43,245,168,0.5)" strokeWidth="1.4" fill="none" />
              <path className="final-path" d="M0 150 C250 150 380 150 500 150" stroke="rgba(43,245,168,0.35)" strokeWidth="1.2" strokeDasharray="4 6" fill="none" />
              <path className="final-path" d="M1000 150 C750 150 620 150 500 150" stroke="rgba(43,245,168,0.35)" strokeWidth="1.2" strokeDasharray="4 6" fill="none" />
            </svg>
            <div className="relative">
              <div className="mb-7 flex justify-center">
                <ThemisMark size={54} glow />
              </div>
              <h2 className="m-0 mx-auto max-w-[820px] text-[32px] font-extrabold leading-[1.12] tracking-[-0.03em] sm:text-[52px]">
                La prochaine fois qu&apos;une réponse compte,{" "}
                <span className="bg-gradient-to-r from-accent to-[#7FF0C2] bg-clip-text text-transparent">
                  demandez plusieurs avis en une fois.
                </span>
              </h2>
              <p className="m-0 mx-auto mt-[22px] max-w-[480px] text-[16.5px] leading-[1.7] text-muted-fg">
                Découvrez ce que les modèles confirment, contestent ou laissent
                de côté.
              </p>
              <div className="mt-9 flex justify-center">
                <Link
                  href={startHref}
                  className="inline-flex items-center gap-[10px] rounded-[14px] bg-primary px-9 py-[17px] text-[16.5px] font-bold text-primary-fg shadow-glow transition hover:brightness-110 hover:-translate-y-px"
                >
                  Tester {SITE_CONFIG.name} gratuitement
                </Link>
              </div>
              <p className="m-0 mt-4 font-mono text-[13px] text-faint">
                Sans carte bancaire
              </p>
            </div>
          </NeonBorder>
        </section>

        {/* ============ FOOTER ============ */}
        <footer className="flex flex-wrap items-center justify-between gap-5 border-t border-white/[.08] py-8 pb-12">
          <div className="flex items-center gap-[10px]">
            <ThemisMark size={20} />
            <span className="text-[15px] font-bold">{SITE_CONFIG.name}</span>
            <span className="text-[14px] text-muted-fg">— {SITE_CONFIG.tagline}</span>
          </div>
          <div className="flex gap-6 text-[14px] text-muted-fg">
            <span>Confidentialité</span>
            <span>Conditions</span>
            <span>Contact</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
