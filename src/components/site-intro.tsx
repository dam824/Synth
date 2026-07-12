"use client";

import { useLayoutEffect, useRef, useState } from "react";

export function SiteIntro() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  useLayoutEffect(() => {
    const storageKey = "themis:intro-seen";
    try {
      if (window.sessionStorage.getItem(storageKey)) {
        setVisible(false);
        return;
      }
      window.sessionStorage.setItem(storageKey, "1");
    } catch {
      // L'introduction reste disponible si le stockage du navigateur est bloqué.
    }

    const root = rootRef.current;
    if (!root) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const target = document.querySelector<HTMLElement>("[data-home-logo]");
    let cancelled = false;
    let ctx: { revert: () => void } | undefined;

    void import("gsap").then(({ gsap }) => {
      if (cancelled) return;
      ctx = gsap.context(() => {
        const introMark = root.querySelector<HTMLElement>("[data-intro-mark]");
        const introWord = root.querySelector<HTMLElement>("[data-intro-word]");
        const targetMark = target?.querySelector<HTMLElement>("[data-logo-mark]");
        const targetWord = target?.querySelector<HTMLElement>("[data-logo-word]");
        if (target) gsap.set(target, { opacity: 0 });

        function destination(
          source: HTMLElement | null,
          destinationElement: HTMLElement | null | undefined,
        ) {
          if (!source || !destinationElement) return null;
          const from = source.getBoundingClientRect();
          const to = destinationElement.getBoundingClientRect();
          return {
            x: to.left - from.left,
            y: to.top - from.top,
            scaleX: to.width / from.width,
            scaleY: to.height / from.height,
          };
        }

        const timeline = gsap.timeline({
          defaults: { ease: "power3.out" },
          onComplete: () => {
            document.body.style.overflow = previousOverflow;
            setVisible(false);
          },
        });

        if (reduced) {
          timeline
            .fromTo("[data-intro-word]", { opacity: 0 }, { opacity: 1, duration: 0.2 })
            .to("[data-intro-backdrop]", { opacity: 0, duration: 0.25, delay: 0.25 })
            .set(target, { opacity: 1 })
            .set(root, { opacity: 0 });
          return;
        }

        timeline
          .fromTo(
            "[data-intro-mark]",
            { opacity: 0, scale: 0.78, filter: "blur(8px)" },
            { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.65 },
          )
          .to("[data-intro-mark]", { scale: 1.04, duration: 1.35, ease: "sine.inOut" })
          .fromTo(
            "[data-intro-word]",
            { opacity: 0, x: 22, letterSpacing: "0.5em" },
            { opacity: 1, x: 0, letterSpacing: "0.24em", duration: 0.65 },
            "-=0.25",
          )
          .addLabel("handoff", "+=0.55")
          .add(() => {
            const markDestination = destination(introMark, targetMark);
            const wordDestination = destination(introWord, targetWord);
            if (!markDestination || !wordDestination) {
              gsap.set(target, { opacity: 1 });
              return;
            }
            gsap.set([introMark, introWord], { transformOrigin: "top left" });
            gsap.to(introMark, {
              ...markDestination,
              duration: 0.95,
              ease: "expo.inOut",
            });
            gsap.to(introWord, {
              ...wordDestination,
              letterSpacing: "-0.01em",
              duration: 0.95,
              ease: "expo.inOut",
            });
          }, "handoff")
          .to("[data-intro-backdrop]", { opacity: 0, duration: 0.8, ease: "power2.inOut" }, "handoff")
          .to([introMark, introWord], { opacity: 0, duration: 0.12 }, "handoff+=0.86")
          .set(target, { opacity: 1 }, "<")
          .set(root, { opacity: 0 });
      }, root);
    });

    return () => {
      cancelled = true;
      ctx?.revert();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[200] flex min-h-[100svh] items-center justify-center"
      role="status"
      aria-label="Chargement de Themis"
    >
      <div data-intro-backdrop className="absolute inset-0 bg-[#06090A]" />
      <div data-intro-lockup className="relative z-10 flex items-center gap-8 sm:gap-10">
        <div
          data-intro-mark
          className="h-[140px] w-[112px] opacity-0 sm:h-[180px] sm:w-[144px]"
        >
          <img
            src="/brand/themis-loader.svg"
            alt="Logo Themis animé"
            className="h-full w-full bg-transparent object-contain"
          />
        </div>
        <div
          data-intro-word
          className="themis-wordmark translate-x-[22px] pl-[0.24em] text-[25px] text-[#F1F7F4] opacity-0 sm:text-[34px]"
        >
          Themis
        </div>
      </div>
    </div>
  );
}
