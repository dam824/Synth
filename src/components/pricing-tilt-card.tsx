"use client";

import type { CSSProperties, PointerEvent, ReactNode } from "react";
import { useRef } from "react";

type PricingTiltCardProps = {
  children: ReactNode;
  featured?: boolean;
};

export function PricingTiltCard({ children, featured = false }: PricingTiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const card = cardRef.current;
    if (!card || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const bounds = card.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;

    card.style.setProperty("--tilt-x", `${(0.5 - y) * 5}deg`);
    card.style.setProperty("--tilt-y", `${(x - 0.5) * 7}deg`);
  }

  function resetTilt() {
    const card = cardRef.current;
    if (!card) return;
    card.style.setProperty("--tilt-x", "0deg");
    card.style.setProperty("--tilt-y", "0deg");
  }

  const variables = {
    "--tilt-x": "0deg",
    "--tilt-y": "0deg",
  } as CSSProperties;

  return (
    <div className="h-full">
      <div
        ref={cardRef}
        style={variables}
        onPointerMove={handlePointerMove}
        onPointerLeave={resetTilt}
        className={`group relative h-full overflow-hidden border backdrop-blur-2xl transition-[transform,border-color,box-shadow] duration-300 ease-out [transform:perspective(1100px)_rotateX(var(--tilt-x))_rotateY(var(--tilt-y))] hover:z-10 motion-reduce:transform-none ${
          featured
            ? "rounded-[34px] border-[#82F8CB]/80 bg-[linear-gradient(145deg,rgba(81,255,196,.12)_0%,rgba(4,17,14,.96)_18%,rgba(2,8,7,.98)_82%,rgba(43,224,157,.08)_100%)] shadow-[0_22px_65px_rgba(0,0,0,.38),inset_10px_0_24px_rgba(68,255,192,.14),inset_-6px_0_18px_rgba(38,220,153,.07),inset_0_10px_24px_rgba(91,255,205,.11),inset_0_-12px_28px_rgba(31,235,163,.14),inset_0_1px_0_rgba(225,255,244,.72),inset_0_-1px_0_rgba(102,255,205,.5)] hover:border-[#B5FFE3] hover:shadow-[0_24px_70px_rgba(0,0,0,.4),inset_12px_0_28px_rgba(68,255,192,.18),inset_-7px_0_22px_rgba(38,220,153,.09),inset_0_12px_28px_rgba(91,255,205,.14),inset_0_-14px_32px_rgba(31,235,163,.18),inset_0_1px_0_rgba(235,255,248,.85)]"
            : "rounded-[24px] border-white/[.13] bg-[linear-gradient(155deg,rgba(255,255,255,.075)_0%,rgba(7,16,14,.82)_34%,rgba(3,10,9,.93)_100%)] shadow-[0_22px_65px_rgba(0,0,0,.34),inset_0_1px_0_rgba(255,255,255,.12)] hover:border-accent/35 hover:shadow-[0_28px_80px_rgba(7,190,127,.14),inset_0_1px_0_rgba(255,255,255,.16)]"
        }`}
      >
        {featured ? (
          <>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -left-8 top-[8%] h-[84%] w-12 rounded-full bg-[#4DFFD0]/20 blur-xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-[8%] top-0 h-10 w-[72%] -translate-y-1/2 rounded-full bg-[#8CFFDA]/14 blur-xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0 left-[10%] h-12 w-[80%] translate-y-1/2 rounded-full bg-[#31EFA9]/18 blur-xl"
            />
          </>
        ) : null}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-70"
        />
        <div className="relative z-[1] h-full">{children}</div>
      </div>
    </div>
  );
}
