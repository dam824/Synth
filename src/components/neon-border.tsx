import type { ReactNode } from "react";

// Conteneur à bordure émeraude statique.
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
        style={{ borderRadius: radius - 1 }}
      >
        {children}
      </div>
    </div>
  );
}
