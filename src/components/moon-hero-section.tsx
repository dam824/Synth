"use client";

import dynamic from "next/dynamic";
import { useLayoutEffect, useRef } from "react";

// Three.js a besoin de `window` → import sans SSR. Ce wrapper est un Client
// Component : c'est ici qu'on a le droit d'utiliser `ssr: false` (interdit dans
// un Server Component en Next 15). La page (server) importe ce composant tel quel.
const MoonHero = dynamic(() => import("@/components/MoonRealistic"), { ssr: false });

// Section hero plein écran. Le lockup (logo + wordmark) est placé DERRIÈRE le
// canvas (z-0 vs z-[1]) : le canvas est transparent hors de la sphère, mais la
// lune est opaque → le lockup émerge de derrière l'arc, et le bas du wordmark
// reste légèrement caché par la lune une fois en place.
export function MoonHeroSection() {
  const logoRef = useRef<HTMLImageElement>(null);
  const wordRef = useRef<HTMLHeadingElement>(null);
  const lineLRef = useRef<HTMLSpanElement>(null);
  const lineRRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const logo = logoRef.current;
    const word = wordRef.current;
    const lineL = lineLRef.current;
    const lineR = lineRRef.current;
    if (!logo || !word || !lineL || !lineR) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      [logo, word, lineL, lineR].forEach((el) => {
        el.style.opacity = "1";
        el.style.transform = "none";
      });
      return;
    }

    let ctx: { revert: () => void } | undefined;
    let cancelled = false;
    void import("gsap").then(({ gsap }) => {
      if (cancelled) return;
      ctx = gsap.context(() => {
        gsap.set([logo, word], { y: "42vh", autoAlpha: 0 });
        // Traits : invisibles, repliés sur leur centre (ils s'élargiront
        // symétriquement vers la gauche et la droite).
        gsap.set([lineL, lineR], { scaleX: 0, autoAlpha: 0, transformOrigin: "50% 50%" });

        const tl = gsap.timeline();
        // 1. Le logo apparaît et monte de derrière la lune…
        tl.to(logo, { autoAlpha: 1, duration: 0.8, ease: "power1.out" }, 0.3)
          .to(logo, { y: 0, duration: 2.4, ease: "power3.out" }, 0.3)
          // 2. …et pendant qu'il monte, le wordmark le suit.
          .to(word, { autoAlpha: 1, duration: 0.8, ease: "power1.out" }, 0.95)
          .to(word, { y: 0, duration: 2.4, ease: "power3.out" }, 0.95)
          // 3. Une fois logo ET wordmark posés, les DEUX traits se forment en
          //    simultané depuis leur centre, symétriquement vers les deux côtés.
          .to([lineL, lineR], { autoAlpha: 1, duration: 0.4, ease: "power1.out" }, 3.0)
          .to([lineL, lineR], { scaleX: 1, duration: 1.3, ease: "power2.out" }, 3.0);
      });
    });

    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, []);

  return (
    <section className="relative h-screen min-h-svh overflow-hidden bg-black">
      {/* Lockup derrière le canvas : émerge de derrière la lune.
          Traits fins au-dessus et en dessous, formés depuis leur centre. */}
      <div className="absolute inset-x-0 top-[38%] z-0 flex flex-col items-center px-[4vw]">
        <span
          ref={lineLRef}
          aria-hidden
          className="mb-[4vh] h-px w-[64vw] opacity-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(255,255,255,0), rgba(128,240,232,.3) 12%, rgba(255,255,255,.85) 32%, rgba(255,255,255,.85) 68%, rgba(128,240,232,.3) 88%, rgba(255,255,255,0))",
          }}
        />
        <div className="flex items-center justify-center gap-[2.5vw]">
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
        <span
          ref={lineRRef}
          aria-hidden
          className="mt-[4vh] h-px w-[56vw] opacity-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(255,255,255,0), rgba(128,240,232,.3) 12%, rgba(255,255,255,.85) 32%, rgba(255,255,255,.85) 68%, rgba(128,240,232,.3) 88%, rgba(255,255,255,0))",
          }}
        />
      </div>
      <MoonHero className="absolute inset-0 z-[1]" />
    </section>
  );
}
