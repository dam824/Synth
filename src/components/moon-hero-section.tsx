"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useLayoutEffect, useRef } from "react";

// Three.js a besoin de `window` → import sans SSR. Ce wrapper est un Client
// Component : c'est ici qu'on a le droit d'utiliser `ssr: false` (interdit dans
// un Server Component en Next 15). La page (server) importe ce composant tel quel.
const MoonHero = dynamic(() => import("@/components/MoonRealistic"), { ssr: false });

const LINE_GRADIENT =
  "linear-gradient(90deg, rgba(255,255,255,0), rgba(128,240,232,.3) 12%, rgba(255,255,255,.85) 32%, rgba(255,255,255,.85) 68%, rgba(128,240,232,.3) 88%, rgba(255,255,255,0))";

// Section hero plein écran, disposition type « 21hrs on the Moon » :
//   [—— UNE DEMANDE · PLUSIEURS ANALYSES ——]
//   [logo]  Themis            ← derrière le canvas : émerge de derrière la lune
//   description               ← sur la lune (au-dessus du canvas)
//   [———— trait ————]
//   [CTA]  + mention discrète
export function MoonHeroSection({ startHref = "/login" }: { startHref?: string }) {
  const logoRef = useRef<HTMLImageElement>(null);
  const wordRef = useRef<HTMLHeadingElement>(null);
  const kickerRef = useRef<HTMLSpanElement>(null);
  const topLineLRef = useRef<HTMLSpanElement>(null);
  const topLineRRef = useRef<HTMLSpanElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);
  const bottomLineRef = useRef<HTMLSpanElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const els = {
      logo: logoRef.current,
      word: wordRef.current,
      kicker: kickerRef.current,
      topLineL: topLineLRef.current,
      topLineR: topLineRRef.current,
      desc: descRef.current,
      bottomLine: bottomLineRef.current,
      cta: ctaRef.current,
    };
    if (Object.values(els).some((el) => !el)) return;
    const { logo, word, kicker, topLineL, topLineR, desc, bottomLine, cta } =
      els as Record<keyof typeof els, HTMLElement>;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      Object.values(els).forEach((el) => {
        el!.style.opacity = "1";
        el!.style.transform = "none";
      });
      return;
    }

    let ctx: { revert: () => void } | undefined;
    let cancelled = false;
    let removeIntroListener: (() => void) | undefined;
    void import("gsap").then(({ gsap }) => {
      if (cancelled) return;
      ctx = gsap.context(() => {
        gsap.set([logo, word], { y: "42vh", autoAlpha: 0 });
        gsap.set(kicker, { autoAlpha: 0, y: 12 });
        // Segments du haut : ils s'étendent depuis le kicker vers l'extérieur.
        gsap.set(topLineL, { scaleX: 0, autoAlpha: 0, transformOrigin: "100% 50%" });
        gsap.set(topLineR, { scaleX: 0, autoAlpha: 0, transformOrigin: "0% 50%" });
        gsap.set(desc, { autoAlpha: 0, y: 24 });
        gsap.set(bottomLine, { scaleX: 0, autoAlpha: 0, transformOrigin: "50% 50%" });
        gsap.set(cta, { autoAlpha: 0, y: 24 });

        // En pause : la séquence ne démarre qu'à la fin de l'intro du site
        // (SiteIntro émet « themis:intro-done ») — sinon tout se jouerait
        // derrière l'overlay d'intro et serait déjà terminé à sa disparition.
        const tl = gsap.timeline({ paused: true });
        // 1. Le logo apparaît et monte de derrière la lune…
        tl.to(logo, { autoAlpha: 1, duration: 0.8, ease: "power1.out" }, 0.3)
          .to(logo, { y: 0, duration: 2.4, ease: "power3.out" }, 0.3)
          // 2. …et pendant qu'il monte, le wordmark le suit.
          .to(word, { autoAlpha: 1, duration: 0.8, ease: "power1.out" }, 0.95)
          .to(word, { y: 0, duration: 2.4, ease: "power3.out" }, 0.95)
          // 3. Lockup posé : kicker + traits du haut (vers l'extérieur).
          .to(kicker, { autoAlpha: 1, y: 0, duration: 0.7, ease: "power2.out" }, 3.0)
          .to([topLineL, topLineR], { autoAlpha: 1, duration: 0.4, ease: "power1.out" }, 3.0)
          .to([topLineL, topLineR], { scaleX: 1, duration: 1.3, ease: "power2.out" }, 3.0)
          // 4. Description sur la lune.
          .to(desc, { autoAlpha: 1, y: 0, duration: 0.9, ease: "power2.out" }, 3.35)
          // 5. Trait du bas (depuis le centre, symétrique).
          .to(bottomLine, { autoAlpha: 1, duration: 0.4, ease: "power1.out" }, 3.55)
          .to(bottomLine, { scaleX: 1, duration: 1.3, ease: "power2.out" }, 3.55)
          // 6. CTA + mention.
          .to(cta, { autoAlpha: 1, y: 0, duration: 0.9, ease: "power2.out" }, 3.8);

        // Démarrage : tout de suite si l'intro est déjà passée (flag global),
        // sinon au signal de fin d'intro. Filet de sécurité à 8 s au cas où le
        // signal ne viendrait jamais (l'animation ne doit pas rester bloquée).
        const introDone = (window as unknown as { __themisIntroDone?: boolean })
          .__themisIntroDone;
        if (introDone) {
          tl.play();
        } else {
          const start = () => tl.play();
          window.addEventListener("themis:intro-done", start, { once: true });
          const fallback = window.setTimeout(start, 8000);
          removeIntroListener = () => {
            window.removeEventListener("themis:intro-done", start);
            window.clearTimeout(fallback);
          };
        }
      });
    });

    return () => {
      cancelled = true;
      removeIntroListener?.();
      ctx?.revert();
    };
  }, []);

  return (
    // Figée en haut (équivalent CSS du « pin » GSAP) : la section suivante
    // glisse par-dessus en remontant, puis le site scrolle normalement.
    // ⚠️ aucun ancêtre en overflow hidden/auto (casserait le sticky) — la
    // racine de la page est en overflow-x-clip pour ça.
    <section className="sticky top-0 z-0 h-screen min-h-svh overflow-hidden bg-black">
      {/* Lockup derrière le canvas : émerge de derrière la lune */}
      <div className="absolute inset-x-0 top-[30%] z-0 flex flex-col items-center px-[4vw]">
        <div className="flex w-[64vw] items-center gap-[1.8vw]">
          <span
            ref={topLineLRef}
            aria-hidden
            className="h-px flex-1 opacity-0"
            style={{ background: LINE_GRADIENT }}
          />
          <span
            ref={kickerRef}
            className="whitespace-nowrap font-mono text-[11px] tracking-[0.28em] text-[#B9D6CB] opacity-0 sm:text-[13px]"
          >
            UNE DEMANDE · PLUSIEURS ANALYSES
          </span>
          <span
            ref={topLineRRef}
            aria-hidden
            className="h-px flex-1 opacity-0"
            style={{ background: LINE_GRADIENT }}
          />
        </div>
        <div className="mt-[3vh] flex items-center justify-center gap-[2.5vw]">
          <img
            ref={logoRef}
            src="/brand/themis-loader.svg"
            alt=""
            className="h-[15vw] w-auto opacity-0 sm:h-[10vw]"
          />
          <h1
            ref={wordRef}
            className="themis-wordmark m-0 bg-clip-text text-[15vw] font-semibold leading-none tracking-[0.02em] text-transparent opacity-0 sm:text-[10vw]"
            style={{
              backgroundImage:
                "linear-gradient(180deg, #EAFFF8 0%, #A8F5D9 34%, #2FBE8F 60%, #0A2A20 100%)",
            }}
          >
            Themis
          </h1>
        </div>
      </div>

      {/* Contenu SUR la lune (au-dessus du canvas) */}
      <div className="absolute inset-x-0 top-[58%] z-[2] flex flex-col items-center px-6">
        <p
          ref={descRef}
          className="m-0 max-w-[640px] text-center text-[15.5px] font-semibold leading-[1.65] text-[#D7E5DE] opacity-0 sm:text-[17px]"
        >
          Themis confronte plusieurs intelligences artificielles, révèle leurs
          désaccords et vous livre une réponse plus solide.
        </p>
        <span
          ref={bottomLineRef}
          aria-hidden
          className="mt-[3.5vh] h-px w-[56vw] opacity-0"
          style={{ background: LINE_GRADIENT }}
        />
        <div ref={ctaRef} className="mt-[5vh] flex flex-col items-center opacity-0">
          <Link
            href={startHref}
            className="inline-flex items-center gap-3 rounded-[14px] bg-primary px-9 py-[17px] font-mono text-[14px] font-bold uppercase tracking-[0.18em] text-primary-fg shadow-[0_0_40px_rgba(43,245,168,.35)] transition hover:-translate-y-px hover:brightness-110"
          >
            Lancer une analyse <span aria-hidden>→</span>
          </Link>
          <p className="m-0 mt-4 font-mono text-[12px] tracking-[0.08em] text-[#93A39B]">
            Sans carte bancaire · 100 crédits offerts
          </p>
        </div>
      </div>

      <MoonHero className="absolute inset-0 z-[1]" />
    </section>
  );
}
