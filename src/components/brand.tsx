import Image from "next/image";

import { SITE_CONFIG } from "@/config/site";

// Losange émeraude = signal d'intelligence de la marque.
export function Diamond({ size = 14 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-block rotate-45 rounded-[3px] bg-accent shadow-glow"
      style={{ width: size, height: size }}
    />
  );
}

export function ThemisMark({ size = 26, glow = false }: { size?: number; glow?: boolean }) {
  return (
    <span
      data-logo-mark
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <Image
        src="/brand/themis-logo.svg"
        alt=""
        width={807}
        height={1044}
        priority
        className="h-full w-full object-contain"
        style={glow ? { filter: "drop-shadow(0 0 14px rgba(43,245,168,0.42))" } : undefined}
      />
    </span>
  );
}

export function Logo({ size = 18 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-[9px]">
      <ThemisMark size={size === 18 ? 24 : 20} />
      <span
        data-logo-word
        className="themis-wordmark tracking-[-0.01em] text-foreground"
        style={{ fontSize: size + 1 }}
      >
        {SITE_CONFIG.name}
      </span>
    </span>
  );
}
