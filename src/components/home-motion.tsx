"use client";

import { useLayoutEffect } from "react";

// Anime la homepage avec GSAP + ScrollTrigger (fidèle au prototype Themis).
// Le hero est pré-masqué en CSS (.home-motion, cf. globals.css) pour éviter
// tout flash avant hydratation ; les sections sous la ligne de flottaison
// sont révélées au scroll. Respecte prefers-reduced-motion.
export function HomeMotion() {
  useLayoutEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    let ctx: { revert: () => void } | undefined;
    let cancelled = false;

    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);

      ctx = gsap.context(() => {
        // ---------- HERO : timeline narrative ----------
        const paths = gsap.utils.toArray<SVGPathElement>(".tra-path");
        paths.forEach((p) => {
          const L = p.getTotalLength();
          const dissent = p.classList.contains("tra-dissent");
          gsap.set(p, {
            strokeDasharray: dissent ? "4 5" : L,
            strokeDashoffset: dissent ? 0 : L,
            opacity: dissent ? 0 : 1,
          });
        });

        gsap.set("[data-hero-copy] > *", { y: 26 });
        gsap.set("[data-hero-panel]", { y: 34 });
        gsap.set("#hero-q", { y: 10 });
        gsap.set(".model-chip", { scale: 0.92, transformOrigin: "50% 50%" });
        gsap.set("#hero-diamond", { scale: 0, transformOrigin: "50% 50%" });
        gsap.set("#hero-answer", { y: 14 });
        gsap.set("#hero-badge", { scale: 0.9, transformOrigin: "50% 50%" });

        // Effet S1 : la séquence ne se joue plus au chargement (la section est
        // cachée sous la lune) mais quand elle entre à l'écran, en fade-in-up.
        const tl = gsap.timeline({
          defaults: { ease: "power3.out" },
          scrollTrigger: { trigger: "#top", start: "top 72%" },
        });
        tl.to("[data-hero-copy] > *", { opacity: 1, y: 0, stagger: 0.09, duration: 0.7 })
          .to("[data-hero-panel]", { opacity: 1, y: 0, duration: 0.8 }, "-=0.55")
          .to("#hero-q", { opacity: 1, y: 0, duration: 0.4 }, "-=0.35")
          .to(".tra-split", { strokeDashoffset: 0, duration: 0.65, stagger: 0.09, ease: "power2.inOut" })
          .to(".model-chip", { opacity: 1, scale: 1, stagger: 0.09, duration: 0.32 }, "-=0.35")
          .to(".tra-merge:not(.tra-dissent)", { strokeDashoffset: 0, duration: 0.65, stagger: 0.09, ease: "power2.inOut" }, "+=0.15")
          .to(".tra-dissent", { opacity: 1, duration: 0.5 }, "-=0.3")
          .to("#hero-diamond", { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(2.2)" })
          .to("#hero-answer", { opacity: 1, y: 0, duration: 0.5 })
          .to("#hero-badge", { opacity: 1, scale: 1, duration: 0.35 });

        // Losange vivant (respiration discrète) — démarre après la séquence,
        // sinon il pulserait depuis scale 0 tant qu'elle n'a pas joué.
        tl.eventCallback("onComplete", () => {
          gsap.to("#hero-diamond", {
            scale: 1.1,
            transformOrigin: "50% 50%",
            duration: 1.8,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
            delay: 1.5,
          });
        });

        // ---------- Révélations au scroll ----------
        // Chaque élément garde son propre trigger (fiable), mais les cartes
        // d'une même grille reçoivent un délai croissant selon leur position
        // → elles apparaissent en fade-in-up LES UNES APRÈS LES AUTRES.
        const reveals = gsap.utils.toArray<HTMLElement>("[data-reveal]");
        const siblingIndex = new Map<HTMLElement, number>();
        reveals.forEach((el) => {
          const parent = el.parentElement;
          if (!parent) return;
          const count = siblingIndex.get(parent) ?? 0;
          siblingIndex.set(parent, count + 1);
          const isCard = reveals.some((other) => other !== el && other.parentElement === parent);
          gsap.from(el, {
            opacity: 0,
            y: 44,
            duration: 1.4,
            ease: "power2.out",
            delay: isCard ? count * 0.22 : 0,
            scrollTrigger: { trigger: el, start: "top 88%" },
          });
        });

        // ---------- Cartes « problème » ----------
        gsap.from(".prob-card", {
          y: 44,
          opacity: 0,
          rotate: (i: number) => (i === 0 ? -2.5 : 2.5),
          stagger: 0.14,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: { trigger: "#probleme-visu", start: "top 80%" },
        });

        // ---------- Tracés accords / désaccords ----------
        gsap.utils.toArray<SVGPathElement>(".acc-line").forEach((p) => {
          const dashed = p.getAttribute("stroke-dasharray");
          if (!dashed) {
            const L = p.getTotalLength();
            gsap.set(p, { strokeDasharray: L, strokeDashoffset: L });
            gsap.to(p, {
              strokeDashoffset: 0,
              duration: 1.1,
              ease: "power2.inOut",
              scrollTrigger: { trigger: p, start: "top 85%" },
            });
          } else {
            gsap.from(p, {
              opacity: 0,
              duration: 1.1,
              ease: "power2.out",
              scrollTrigger: { trigger: p, start: "top 85%" },
            });
          }
        });

        // ---------- Jauge de convergence ----------
        gsap.from("#conv-fill", {
          scaleX: 0,
          transformOrigin: "0 50%",
          duration: 1.1,
          ease: "power2.out",
          scrollTrigger: { trigger: "#conv-fill", start: "top 88%" },
        });

        // ---------- Convergence finale ----------
        gsap.utils.toArray<SVGPathElement>(".final-path").forEach((p) => {
          const L = p.getTotalLength();
          gsap.set(p, { strokeDasharray: L, strokeDashoffset: L });
        });
        gsap.to(".final-path", {
          strokeDashoffset: 0,
          duration: 1.4,
          stagger: 0.12,
          ease: "power2.inOut",
          scrollTrigger: { trigger: "#final", start: "top 72%" },
        });
      });
    })();

    return () => {
      cancelled = true;
      if (ctx) ctx.revert();
    };
  }, []);

  return null;
}
