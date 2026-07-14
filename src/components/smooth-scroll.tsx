"use client";

import { useEffect } from "react";

// Scroll inertiel Lenis, synchronisé avec GSAP ScrollTrigger (indispensable :
// les triggers doivent se mettre à jour au rythme du scroll lissé). Monté
// uniquement sur la homepage. Respecte prefers-reduced-motion.
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    void Promise.all([
      import("lenis"),
      import("gsap"),
      import("gsap/ScrollTrigger"),
    ]).then(([lenisMod, { gsap }, { ScrollTrigger }]) => {
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);

      const lenis = new lenisMod.default({ lerp: 0.11 });
      lenis.on("scroll", ScrollTrigger.update);

      // Lenis est cadencé par le ticker GSAP (une seule boucle rAF).
      const onTick = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(onTick);
      gsap.ticker.lagSmoothing(0);

      cleanup = () => {
        gsap.ticker.remove(onTick);
        lenis.destroy();
      };
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  return null;
}
