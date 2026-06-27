"use client";

import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

import { Diamond, Logo } from "@/components/brand";
import type { SynthResponse } from "@/lib/ai/types";

interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
}

interface SynthClientProps {
  userEmail: string;
  conversations: ConversationSummary[];
}

type Phase = "empty" | "loading" | "answer" | "error";

const LOADING_MESSAGES = [
  "SYNTH analyse votre demande…",
  "SYNTH confronte les pistes…",
  "SYNTH affine la réponse…",
  "Préparation de la meilleure réponse…",
];

const CONFIDENCE = {
  high: {
    label: "Confiance élevée",
    className: "bg-[#EDF7F0] border-[#D6EDDF] text-[#1E7A48]",
  },
  medium: {
    label: "Confiance modérée",
    className: "bg-[#FBF5E8] border-[#F0E4C6] text-[#9A6B12]",
  },
  low: {
    label: "À vérifier",
    className: "bg-[#F3F2EF] border-border text-[#76747D]",
  },
} as const;

function initials(email: string): string {
  const name = email.split("@")[0] ?? "";
  const parts = name.split(/[.\-_]/).filter(Boolean);
  const letters = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  return (letters || name.slice(0, 2) || "?").toUpperCase();
}

export function SynthClient({ userEmail, conversations }: SynthClientProps) {
  const [question, setQuestion] = useState("");
  const [askedQuestion, setAskedQuestion] = useState("");
  const [phase, setPhase] = useState<Phase>("empty");
  const [loadingIndex, setLoadingIndex] = useState(0);
  const [result, setResult] = useState<SynthResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [toast, setToast] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fait défiler les messages de chargement, indépendamment de la durée réelle.
  useEffect(() => {
    if (phase !== "loading") return;
    setLoadingIndex(0);
    intervalRef.current = setInterval(() => {
      setLoadingIndex((i) => Math.min(i + 1, LOADING_MESSAGES.length - 1));
    }, 1100);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [phase]);

  async function submit() {
    const q = question.trim();
    if (!q || phase === "loading") return;

    setAskedQuestion(q);
    setPhase("loading");
    setResult(null);
    setErrorMsg("");

    try {
      const res = await fetch("/api/synth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: q, conversationId: activeConversationId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(
          data?.error ??
            "Impossible de générer une réponse pour le moment. Réessayez dans quelques instants.",
        );
        setPhase("error");
        return;
      }

      const payload = data as SynthResponse;
      setResult(payload);
      setActiveConversationId(payload.conversationId);
      setPhase("answer");
      setQuestion("");
    } catch {
      setErrorMsg(
        "Impossible de générer une réponse pour le moment. Réessayez dans quelques instants.",
      );
      setPhase("error");
    }
  }

  function newQuestion(freshConversation = false) {
    if (freshConversation) setActiveConversationId(null);
    setPhase("empty");
    setQuestion("");
    setAskedQuestion("");
    setResult(null);
    setErrorMsg("");
  }

  async function copyAnswer() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.final.finalAnswer);
      setToast(true);
      setTimeout(() => setToast(false), 2000);
    } catch {
      /* clipboard indisponible : on ignore silencieusement */
    }
  }

  const headerNote =
    phase === "answer"
      ? "Réponse prête"
      : phase === "loading"
        ? "Réflexion en cours…"
        : phase === "error"
          ? "Erreur"
          : "Prêt";

  const showComposer = phase !== "answer";
  const submitDisabled = !question.trim() || phase === "loading";

  return (
    <div className="flex h-screen">
      {/* Sidebar (desktop) */}
      <aside className="synth-scroll hidden w-[248px] flex-shrink-0 flex-col overflow-y-auto border-r border-border bg-[#FAF9F6] lg:flex">
        <div className="px-4 pb-[10px] pt-4">
          <button
            onClick={() => newQuestion(true)}
            className="flex h-[42px] w-full items-center gap-[9px] rounded-md bg-primary px-[14px] text-[14px] font-semibold tracking-[-0.01em] text-white transition hover:opacity-90"
          >
            <span className="text-[17px] font-normal leading-none">+</span>{" "}
            Nouvelle question
          </button>
        </div>
        <div className="px-4 pb-[6px] pt-[14px] font-mono text-[11px] tracking-[0.06em] text-faint">
          RÉCENTES
        </div>
        <div className="flex flex-col gap-[2px] px-2">
          {conversations.length === 0 && (
            <p className="px-3 text-[13px] text-faint">Aucune question.</p>
          )}
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveConversationId(c.id)}
              title={c.title}
              className={`truncate rounded-[9px] px-3 py-[10px] text-left text-[13.5px] leading-[1.4] transition hover:bg-[#F1EFEA] ${
                activeConversationId === c.id
                  ? "bg-[#F1EFEA] text-foreground"
                  : "text-[#56555D]"
              }`}
            >
              {c.title}
            </button>
          ))}
        </div>
        <div className="mt-auto flex items-center justify-between border-t border-border px-4 py-[14px]">
          <div className="flex min-w-0 items-center gap-[9px]">
            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#E4DCFB] text-[12px] font-semibold text-[#5A48B0]">
              {initials(userEmail)}
            </span>
            <span className="truncate text-[13px] text-[#46454C]">
              {userEmail}
            </span>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            title="Déconnexion"
            className="p-1 text-[15px] text-faint transition hover:text-foreground"
          >
            ⏻
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="synth-scroll flex flex-1 flex-col overflow-y-auto">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/85 px-6 py-[14px] backdrop-blur">
          <Logo size={15} />
          <span className="font-mono text-[11px] text-faint">{headerNote}</span>
        </header>

        <div className="mx-auto flex w-full max-w-[720px] flex-1 flex-col px-6 pb-10 pt-6">
          {/* Empty */}
          {phase === "empty" && (
            <div className="animate-synth-rise flex flex-1 flex-col items-center justify-center py-[30px] text-center">
              <div className="mb-5 flex h-[46px] w-[46px] items-center justify-center rounded-[13px] bg-accent-soft">
                <Diamond size={16} />
              </div>
              <h1 className="m-0 mb-[9px] text-[26px] font-semibold tracking-[-0.02em]">
                Que voulez-vous savoir ?
              </h1>
              <p className="m-0 max-w-[380px] text-[15.5px] leading-[1.5] text-muted-fg">
                Posez une question. SYNTH confronte les pistes et vous rend la
                meilleure réponse.
              </p>
            </div>
          )}

          {/* Loading */}
          {phase === "loading" && (
            <div className="flex flex-1 flex-col items-center justify-center py-[30px] text-center">
              <div className="mb-[22px] flex items-center gap-[7px]">
                <span className="animate-synth-pulse h-[9px] w-[9px] rounded-full bg-accent" />
                <span
                  className="animate-synth-pulse h-[9px] w-[9px] rounded-full bg-accent"
                  style={{ animationDelay: "0.2s" }}
                />
                <span
                  className="animate-synth-pulse h-[9px] w-[9px] rounded-full bg-accent"
                  style={{ animationDelay: "0.4s" }}
                />
              </div>
              <p className="m-0 mb-5 min-h-[24px] text-[17px] font-medium text-[#2C2B32]">
                {LOADING_MESSAGES[loadingIndex]}
              </p>
              <div className="relative h-1 w-[200px] overflow-hidden rounded-full bg-[#EEEAFB]">
                <span className="animate-synth-bar absolute top-0 h-full w-[40%] rounded-full bg-accent" />
              </div>
            </div>
          )}

          {/* Error */}
          {phase === "error" && (
            <div className="animate-synth-rise flex flex-1 flex-col items-center justify-center py-[30px] text-center">
              <div className="w-full max-w-[440px] rounded-xl border border-[#EAD3CF] bg-[#FBF0EE] p-6">
                <h2 className="m-0 mb-2 text-[17px] font-semibold text-[#C0362C]">
                  Une erreur est survenue
                </h2>
                <p className="m-0 mb-5 text-[14.5px] leading-[1.55] text-[#8A5A55]">
                  {errorMsg}
                </p>
                <button
                  onClick={() => {
                    setQuestion(askedQuestion);
                    setPhase("empty");
                  }}
                  className="h-[42px] rounded-md border border-[#E2E0DA] bg-surface px-[18px] text-[14px] font-semibold text-foreground transition hover:bg-[#FAFAF8]"
                >
                  Réessayer
                </button>
              </div>
            </div>
          )}

          {/* Answer */}
          {phase === "answer" && result && (
            <div className="animate-synth-rise">
              {/* Question posée */}
              <div className="mb-[22px] flex items-start gap-[11px] rounded-[13px] border border-border bg-surface px-[17px] py-[15px]">
                <span className="pt-[2px] font-mono text-[12px] text-[#9B99A1]">
                  Q
                </span>
                <span className="text-[15.5px] leading-[1.5] text-[#3A3940]">
                  {askedQuestion}
                </span>
              </div>

              {/* Méta */}
              <div className="mb-[14px] flex flex-wrap items-center gap-[9px]">
                <span
                  className={`inline-flex items-center gap-[6px] rounded-full border px-[11px] py-[5px] text-[12px] font-semibold ${
                    CONFIDENCE[result.final.confidence].className
                  }`}
                >
                  ● {CONFIDENCE[result.final.confidence].label}
                </span>
                <span className="font-mono text-[11px] text-faint">
                  Réponse synthétisée
                </span>
              </div>

              {/* Titre */}
              <h1 className="m-0 mb-4 text-[23px] font-semibold leading-[1.25] tracking-[-0.02em]">
                {result.final.title}
              </h1>

              {/* Corps */}
              <div className="text-[16px] leading-[1.65] text-[#33323A]">
                <p className="m-0 mb-4 whitespace-pre-wrap">
                  {result.final.finalAnswer}
                </p>

                {result.final.keyPoints.length > 0 && (
                  <>
                    <p className="m-0 mb-2 text-[15px] font-semibold text-[#1F1E24]">
                      Points clés
                    </p>
                    <ul className="m-0 mb-5 list-disc pl-5 text-[#46454C]">
                      {result.final.keyPoints.map((p, i) => (
                        <li key={i} className="mb-[7px]">
                          {p}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>

              {/* Nuance */}
              {result.final.disagreements.length > 0 && (
                <details className="mb-6 rounded-lg border border-border bg-[#F7F6F3] px-4 py-[14px]">
                  <summary className="flex cursor-pointer list-none items-center gap-2 text-[14px] font-medium text-[#56555D]">
                    <span className="text-accent">◇</span> Une nuance a été
                    retenue
                  </summary>
                  <div className="mt-3 space-y-2 text-[14.5px] leading-[1.55] text-[#6B6A72]">
                    {result.final.disagreements.map((d, i) => (
                      <p key={i} className="m-0">
                        {d}
                      </p>
                    ))}
                  </div>
                </details>
              )}

              {/* Actions */}
              <div className="flex gap-[9px]">
                <button
                  onClick={() => newQuestion(false)}
                  className="h-[42px] rounded-md border border-[#E2E0DA] bg-surface px-[18px] text-[14px] font-semibold text-foreground transition hover:bg-[#FAFAF8]"
                >
                  Nouvelle question
                </button>
                <button
                  onClick={copyAnswer}
                  className="h-[42px] rounded-md px-[18px] text-[14px] font-medium text-muted-fg transition hover:text-foreground"
                >
                  {toast ? "Réponse copiée." : "Copier la réponse"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Composer sticky */}
        {showComposer && (
          <div className="sticky bottom-0 bg-gradient-to-t from-background from-70% to-transparent px-6 pb-[22px] pt-[14px]">
            <div className="mx-auto max-w-[720px]">
              <div className="rounded-xl border border-[#E2E0DA] bg-surface p-2 shadow-composer focus-within:border-[#C9BEF0]">
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      submit();
                    }
                  }}
                  placeholder="Posez votre question…"
                  rows={2}
                  className="w-full resize-none bg-transparent px-3 pb-1 pt-[10px] text-[16px] leading-[1.5] text-foreground outline-none placeholder:text-faint"
                />
                <div className="flex items-center justify-between px-[6px] pb-[2px] pt-1">
                  <span className="font-mono text-[11px] text-[#B6B4BA]">
                    Entrée pour envoyer
                  </span>
                  <button
                    onClick={submit}
                    disabled={submitDisabled}
                    className={`h-9 rounded-md px-4 text-[14px] font-semibold tracking-[-0.01em] transition ${
                      submitDisabled
                        ? "cursor-not-allowed bg-[#EDEBE6] text-[#B6B4BA]"
                        : "bg-primary text-white hover:opacity-90"
                    }`}
                  >
                    Demander à SYNTH →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
