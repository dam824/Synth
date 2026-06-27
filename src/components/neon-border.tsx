import type { ReactNode } from "react";

// Bordure néon animée : un arc conique tourne derrière un cœur sombre, ne
// laissant apparaître qu'un liseré lumineux qui « avance » autour de la carte.
export function NeonBorder({
  radius = 18,
  className = "",
  innerClassName = "",
  children,
}: {
  radius?: number;
  className?: string;
  innerClassName?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`neon-border ${className}`}
      style={{ borderRadius: radius }}
    >
      <div
        className={`relative bg-[rgba(10,16,14,.92)] backdrop-blur-xl ${innerClassName}`}
        style={{ margin: 1.5, borderRadius: radius - 2 }}
      >
        {children}
      </div>
    </div>
  );
}
