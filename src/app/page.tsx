import Link from "next/link";

import { auth } from "@/auth";
import { Diamond, Logo } from "@/components/brand";
import { NeonBorder } from "@/components/neon-border";

const STEPS = [
  {
    n: "1",
    title: "Vous écrivez",
    body: "Une seule question, dans vos mots. Pas de réglages, pas de modèle à choisir.",
  },
  {
    n: "2",
    title: "SYNTH travaille",
    body: "Plusieurs pistes de réflexion sont confrontées et affinées en arrière-plan.",
  },
  {
    n: "3",
    title: "Vous recevez",
    body: "Une seule réponse, claire et fiable. Pas de versions à comparer.",
  },
];

const BENEFITS = [
  {
    title: "Plus de confiance",
    body: "Une réponse confrontée à plusieurs angles vaut mieux qu'une intuition isolée.",
  },
  {
    title: "Moins d'effort",
    body: "Aucun arbitrage à faire. SYNTH tranche et synthétise à votre place.",
  },
  {
    title: "Plus de clarté",
    body: "Un titre, une réponse, des points clés. Rien de superflu.",
  },
];

const EXAMPLES = [
  "« Comment négocier une augmentation sans braquer mon manager ? »",
  "« Quel régime fiscal pour mon premier investissement locatif ? »",
  "« Résume-moi ce contrat et dis-moi ce qui cloche. »",
  "« Quelle stratégie de prix pour le lancement de mon produit ? »",
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
              href="/login"
              className="flex h-[38px] items-center rounded-[10px] px-[14px] text-[14px] font-medium text-muted-fg transition hover:bg-white/[.05]"
            >
              Se connecter
            </Link>
            <Link
              href={startHref}
              className="glass-accent flex h-[38px] items-center rounded-[10px] px-4 text-[14px] font-semibold tracking-[-0.01em] text-[#7FF0C2] transition hover:brightness-110"
            >
              Essayer SYNTH
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
            <h1 className="m-0 mb-[22px] text-[44px] font-bold leading-[1.0] tracking-[-0.04em] sm:text-[64px]">
              Une question.
              <br />
              <span className="bg-gradient-to-r from-accent via-[#7FF0C2] to-accent bg-clip-text text-transparent drop-shadow-[0_0_38px_rgba(43,245,168,.35)]">
                La meilleure réponse.
              </span>
            </h1>
            <p className="m-0 mb-[34px] max-w-[480px] text-[18.5px] leading-[1.55] text-muted-fg">
              Arrêtez de comparer les réponses. SYNTH confronte, affine et
              synthétise pour vous — et ne vous rend qu&apos;une seule réponse,
              claire et utile.
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
                synth.app/app
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

        {/* Workflow */}
        <section id="how" className="px-0 pb-[30px] pt-12">
          <p className="m-0 mb-3 text-center font-mono text-[12px] tracking-[0.08em] text-[#4FE3A8]">
            COMMENT ÇA MARCHE
          </p>
          <h2 className="m-0 mb-[46px] text-center text-[34px] font-bold tracking-[-0.03em]">
            Trois secondes pour comprendre
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

        {/* Avant / Après */}
        <section className="px-0 pb-[30px] pt-[54px]">
          <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2">
            <div className="glass-soft rounded-xl p-7">
              <p className="m-0 mb-4 font-mono text-[12px] text-faint">AVANT</p>
              <p className="m-0 mb-4 text-[17px] font-semibold text-muted-fg">
                Vous jonglez entre les onglets.
              </p>
              <div className="flex flex-col gap-[9px]">
                <div className="h-[11px] w-[90%] rounded-[5px] bg-white/[.06]" />
                <div className="h-[11px] w-[70%] rounded-[5px] bg-white/[.06]" />
                <div className="h-[11px] w-[82%] rounded-[5px] bg-white/[.06]" />
              </div>
              <p className="mb-0 mt-[18px] text-[14px] leading-[1.5] text-faint">
                Trois réponses différentes. Laquelle croire ? Vous arbitrez seul.
              </p>
            </div>
            <NeonBorder radius={16} className="shadow-accent" innerClassName="p-7">
              <p className="m-0 mb-4 font-mono text-[12px] text-accent">APRÈS</p>
              <p className="m-0 mb-4 text-[17px] font-semibold">
                Une réponse. La bonne.
              </p>
              <div className="flex flex-col gap-[9px]">
                <div className="h-[11px] w-[95%] rounded-[5px] bg-primary shadow-glow" />
                <div className="h-[11px] w-[78%] rounded-[5px] bg-[#274038]" />
                <div className="h-[11px] w-[86%] rounded-[5px] bg-[#274038]" />
              </div>
              <p className="mb-0 mt-[18px] text-[14px] leading-[1.5] text-muted-fg">
                SYNTH a déjà fait l&apos;arbitrage. Vous lisez, vous décidez.
              </p>
            </NeonBorder>
          </div>
        </section>

        {/* Bénéfices */}
        <section className="grid grid-cols-1 gap-[30px] px-0 pb-[30px] pt-[54px] sm:grid-cols-3">
          {BENEFITS.map((b) => (
            <div key={b.title}>
              <h3 className="m-0 mb-2 text-[16px] font-semibold tracking-[-0.01em]">
                {b.title}
              </h3>
              <p className="m-0 text-[14.5px] leading-[1.55] text-muted-fg">
                {b.body}
              </p>
            </div>
          ))}
        </section>

        {/* Exemples */}
        <section className="px-0 pb-[30px] pt-10">
          <h2 className="m-0 mb-[22px] text-[24px] font-bold tracking-[-0.02em]">
            Pour vos vraies questions
          </h2>
          <div className="marquee-mask overflow-hidden">
            <div className="animate-synth-marquee flex w-max gap-3">
              {[...EXAMPLES, ...EXAMPLES].map((ex, i) => (
                <div
                  key={i}
                  className="glass-soft w-[320px] shrink-0 rounded-[13px] px-5 py-[18px] text-[15px] text-muted-fg"
                >
                  {ex}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="my-[50px]">
          <NeonBorder
            radius={22}
            className="shadow-accent"
            innerClassName="px-8 py-[54px] text-center"
          >
            <h2 className="m-0 mb-3 text-[34px] font-bold tracking-[-0.03em] text-foreground">
            Vous posez la question.
            <br />
            <span className="bg-gradient-to-r from-accent to-[#7FF0C2] bg-clip-text text-transparent drop-shadow-[0_0_22px_rgba(43,245,168,.35)]">
              SYNTH s&apos;occupe du reste.
            </span>
          </h2>
          <p className="mx-auto mb-7 max-w-[420px] text-[16px] text-muted-fg">
            Gratuit pour vos premières questions. Aucune carte requise.
          </p>
          <Link
            href={startHref}
            className="inline-flex h-[50px] items-center rounded-xl bg-primary px-7 text-[16px] font-semibold tracking-[-0.01em] text-primary-fg shadow-glow transition hover:opacity-90"
          >
            Demander à SYNTH
          </Link>
          </NeonBorder>
        </section>

        {/* Footer */}
        <footer className="flex flex-wrap items-center justify-between gap-[14px] border-t border-white/[.06] py-[30px] pb-12">
          <div className="flex items-center gap-2">
            <Diamond size={11} />
            <span className="text-[14px] font-semibold">SYNTH</span>
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
