"use client";

import { useState } from "react";

export function BillingCheckoutButton({
  planKey,
  children,
}: {
  planKey: "essentiel" | "pro";
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ planKey }),
      });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) {
        throw new Error(payload.error ?? "Paiement indisponible.");
      }
      window.location.assign(payload.url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Paiement indisponible.");
      setLoading(false);
    }
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={startCheckout}
        disabled={loading}
        className="inline-flex h-[44px] w-full items-center justify-center rounded-[12px] bg-primary px-4 text-[14px] font-semibold text-primary-fg shadow-glow transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60"
      >
        {loading ? "Redirection sécurisée…" : children}
      </button>
      {error ? <p className="mb-0 mt-2 text-center text-[12px] text-red-300">{error}</p> : null}
    </div>
  );
}
