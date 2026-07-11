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

export function Logo({ size = 18 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-[9px]">
      <Diamond size={size === 18 ? 14 : 13} />
      <span
        className="font-bold tracking-[-0.02em] text-foreground"
        style={{ fontSize: size }}
      >
        {SITE_CONFIG.name}
      </span>
    </span>
  );
}
