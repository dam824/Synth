"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";

import { Diamond } from "@/components/brand";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="animate-synth-rise w-full max-w-[392px]">
        <div className="mb-[30px] text-center">
          <div className="mb-6 inline-flex items-center gap-[9px]">
            <Diamond size={16} />
            <span className="text-[21px] font-bold tracking-[-0.02em]">Orsic</span>
          </div>
          <h1 className="m-0 mb-[9px] text-[24px] font-semibold tracking-[-0.02em]">
            Bon retour
          </h1>
          <p className="m-0 text-[15px] leading-[1.5] text-muted-fg">
            Une question. La meilleure réponse.
            <br />
            Connectez-vous pour continuer.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
          <button
            onClick={() => signIn("google", { callbackUrl: "/app" })}
            className="mb-[11px] flex h-12 w-full items-center justify-center gap-[10px] rounded-[11px] border border-border bg-white/[.04] text-[15px] font-semibold text-foreground transition hover:bg-white/[.07]"
          >
            <span
              className="inline-block h-[18px] w-[18px] rounded-full"
              style={{
                background:
                  "conic-gradient(from -45deg,#EA4335,#FBBC05,#34A853,#4285F4,#EA4335)",
              }}
            />
            Continuer avec Google
          </button>
          <button
            onClick={() => signIn("github", { callbackUrl: "/app" })}
            className="flex h-12 w-full items-center justify-center gap-[10px] rounded-[11px] border border-primary bg-primary text-[15px] font-semibold text-primary-fg shadow-glow transition hover:opacity-90"
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 16 16"
              fill="currentColor"
              aria-hidden
            >
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            Continuer avec GitHub
          </button>
          <p className="m-0 mt-[18px] text-center text-[12.5px] leading-[1.5] text-faint">
            En continuant, vous acceptez nos Conditions
            <br />
            et notre Politique de confidentialité.
          </p>
        </div>

        <div className="mt-[22px] text-center">
          <Link
            href="/"
            className="inline-block p-2 text-[14px] font-medium text-muted-fg hover:text-foreground"
          >
            ← Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
