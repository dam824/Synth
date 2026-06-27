"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

// Fournit le contexte de session côté client (useSession dans les composants).
export function Providers({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
