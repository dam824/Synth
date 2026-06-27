import Link from "next/link";

import { auth } from "@/auth";
import { Diamond, Logo } from "@/components/brand";

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
    <div className="synth-scroll mx-auto max-w-[1080px] px-6">
      {/* Nav */}
      <nav className="flex items-center justify-between py-[26px]">
        <Logo />
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="flex h-[38px] items-center rounded-[9px] px-[14px] text-[14px] font-medium text-muted-fg transition hover:bg-white/5"
          >
            Se connecter
          </Link>
          <Link
            href={startHref}
            className="flex h-[38px] items-center rounded-[9px] bg-primary px-4 text-[14px] font-semibold tracking-[-0.01em] text-primary-fg shadow-glow transition hover:opacity-90"
          >
            Essayer SYNTH
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <header className="mx-auto max-w-[760px] px-0 pb-[60px] pt-[74px] text-center">
        <div className="mb-7 inline-flex items-center gap-[7px] rounded-full border border-primary/25 bg-accent-soft px-[13px] py-[6px]">
          <span className="animate-synth-glow h-[6px] w-[6px] rounded-full bg-accent shadow-glow" />
          <span className="text-[12.5px] font-medium text-accent-strong">
            La meilleure réponse, pas juste une IA
          </span>
        </div>
        <h1 className="m-0 mb-[22px] text-[40px] font-bold leading-[1.04] tracking-[-0.035em] sm:text-[58px]">
          Une question.
          <br />
          <span className="text-accent drop-shadow-[0_0_24px_rgba(43,245,168,.35)]">
            La meilleure réponse.
          </span>
        </h1>
        <p className="mx-auto mb-9 max-w-[540px] text-[19px] leading-[1.55] text-muted-fg">
          Arrêtez de comparer les réponses. SYNTH confronte, affine et synthétise
          pour vous — et ne vous rend qu&apos;une seule réponse, claire et utile.
        </p>
        <div className="flex flex-wrap justify-center gap-[11px]">
          <Link
            href={startHref}
            className="inline-flex h-[50px] items-center gap-2 rounded-xl bg-primary px-[26px] text-[16px] font-semibold tracking-[-0.01em] text-primary-fg shadow-glow transition hover:opacity-90"
          >
            Poser ma première question →
          </Link>
          <a
            href="#how"
            className="inline-flex h-[50px] items-center rounded-xl border border-border bg-white/[.03] px-[22px] text-[16px] font-semibold text-foreground transition hover:bg-white/[.06]"
          >
            Voir comment ça marche
          </a>
        </div>
      </header>

      {/* Aperçu produit */}
      <div className="mb-10 mt-2 overflow-hidden rounded-[18px] border border-border bg-surface shadow-preview">
        <div className="flex items-center gap-[7px] border-b border-border-soft px-4 py-[13px]">
          <span className="h-[9px] w-[9px] rounded-full bg-[#26342D]" />
          <span className="h-[9px] w-[9px] rounded-full bg-[#26342D]" />
          <span className="h-[9px] w-[9px] rounded-full bg-[#26342D]" />
          <span className="ml-2 font-mono text-[11px] text-faint">
            synth.app/app
          </span>
        </div>
        <div className="px-[30px] pb-[34px] pt-[30px]">
          <div className="mb-[18px] flex items-start gap-3 rounded-[13px] border border-border bg-surface-soft px-[18px] py-4">
            <span className="pt-[2px] font-mono text-[12px] text-faint">Q</span>
            <span className="text-[15.5px] text-[#C6D2CB]">
              Quelle structure juridique choisir pour lancer mon activité de
              freelance en France ?
            </span>
          </div>
          <div className="mb-[14px] flex items-center gap-[9px]">
            <span className="inline-flex items-center gap-[6px] rounded-full border border-primary/30 bg-accent-soft px-[11px] py-[5px] text-[12px] font-semibold text-accent-strong">
              ● Confiance élevée
            </span>
            <span className="font-mono text-[11px] text-faint">
              Réponse synthétisée
            </span>
          </div>
          <p className="m-0 mb-2 text-[16px] font-semibold tracking-[-0.01em]">
            La micro-entreprise reste le meilleur point de départ.
          </p>
          <p className="m-0 text-[15px] leading-[1.6] text-muted-fg">
            Pour démarrer seul avec peu de charges, le statut de
            micro-entrepreneur offre la simplicité administrative et une
            fiscalité allégée. Vous passerez en EURL ou SASU plus tard, quand
            votre chiffre d&apos;affaires le justifiera.
          </p>
        </div>
      </div>

      {/* Workflow */}
      <section id="how" className="px-0 pb-[30px] pt-16">
        <p className="m-0 mb-3 text-center font-mono text-[12px] tracking-[0.08em] text-accent-strong">
          COMMENT ÇA MARCHE
        </p>
        <h2 className="m-0 mb-[46px] text-center text-[34px] font-bold tracking-[-0.03em]">
          Trois secondes pour comprendre
        </h2>
        <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-3">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="rounded-xl border border-border bg-surface p-[26px]"
            >
              <div className="mb-[18px] flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-accent-soft text-[15px] font-bold text-accent">
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
          <div className="rounded-xl border border-border-soft bg-surface-soft p-7">
            <p className="m-0 mb-4 font-mono text-[12px] text-faint">AVANT</p>
            <p className="m-0 mb-4 text-[17px] font-semibold text-muted-fg">
              Vous jonglez entre les onglets.
            </p>
            <div className="flex flex-col gap-[9px]">
              <div className="h-[11px] w-[90%] rounded-[5px] bg-[#1E2A24]" />
              <div className="h-[11px] w-[70%] rounded-[5px] bg-[#1E2A24]" />
              <div className="h-[11px] w-[82%] rounded-[5px] bg-[#1E2A24]" />
            </div>
            <p className="mb-0 mt-[18px] text-[14px] leading-[1.5] text-faint">
              Trois réponses différentes. Laquelle croire ? Vous arbitrez seul.
            </p>
          </div>
          <div className="rounded-xl border border-primary/30 bg-surface p-7 shadow-accent">
            <p className="m-0 mb-4 font-mono text-[12px] text-accent">APRÈS</p>
            <p className="m-0 mb-4 text-[17px] font-semibold">Une réponse. La bonne.</p>
            <div className="flex flex-col gap-[9px]">
              <div className="h-[11px] w-[95%] rounded-[5px] bg-primary shadow-glow" />
              <div className="h-[11px] w-[78%] rounded-[5px] bg-[#274038]" />
              <div className="h-[11px] w-[86%] rounded-[5px] bg-[#274038]" />
            </div>
            <p className="mb-0 mt-[18px] text-[14px] leading-[1.5] text-muted-fg">
              SYNTH a déjà fait l&apos;arbitrage. Vous lisez, vous décidez.
            </p>
          </div>
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {EXAMPLES.map((ex) => (
            <div
              key={ex}
              className="rounded-[13px] border border-border bg-surface px-5 py-[18px] text-[15px] text-muted-fg"
            >
              {ex}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="my-[50px] rounded-[22px] border border-primary/20 bg-gradient-to-br from-[#0A1411] to-surface px-8 py-[54px] text-center shadow-accent">
        <h2 className="m-0 mb-3 text-[34px] font-bold tracking-[-0.03em] text-foreground">
          Vous posez la question.
          <br />
          <span className="text-accent drop-shadow-[0_0_22px_rgba(43,245,168,.35)]">
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
      </section>

      {/* Footer */}
      <footer className="flex flex-wrap items-center justify-between gap-[14px] border-t border-border py-[30px] pb-12">
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
  );
}
