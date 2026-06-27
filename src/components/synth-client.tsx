"use client";

import { signOut } from "next-auth/react";
import { useRef, useState } from "react";

import { Diamond, Logo } from "@/components/brand";
import type {
  ConfidenceLevel,
  JudgeResult,
  ProviderName,
} from "@/lib/ai/types";

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
type StepStatus = "running" | "ok" | "fail";

interface ProviderStep {
  status: StepStatus;
  latencyMs?: number;
  error?: string;
  content?: string;
}

interface ProviderView {
  provider: ProviderName;
  ok: boolean;
  model?: string;
  content?: string;
  error?: string;
  latencyMs: number;
}

interface FinalPayload {
  conversationId: string;
  final: JudgeResult;
  providers: ProviderView[];
}

const PROVIDER_ORDER: ProviderName[] = ["openai", "anthropic", "gemini"];
const PROVIDER_LABEL: Record<ProviderName, string> = {
  openai: "GPT",
  anthropic: "Claude",
  gemini: "Gemini",
};

const STATUS_TEXT: Record<StepStatus, string> = {
  running: "réfléchit…",
  ok: "a répondu",
  fail: "indisponible",
};

const CONFIDENCE: Record<
  ConfidenceLevel,
  { label: string; className: string }
> = {
  high: {
    label: "Confiance élevée",
    className:
      "border-[rgba(43,245,168,.28)] bg-accent-soft text-accent-strong",
  },
  medium: {
    label: "Confiance modérée",
    className: "border-[#5a4a1e] bg-[#191407] text-[#e0b75a]",
  },
  low: {
    label: "À vérifier",
    className: "border-border bg-surface-soft text-muted-fg",
  },
};

function initials(email: string): string {
  const name = email.split("@")[0] ?? "";
  const parts = name.split(/[.\-_]/).filter(Boolean);
  const letters = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  return (letters || name.slice(0, 2) || "?").toUpperCase();
}

function emptySteps(): Record<ProviderName, ProviderStep> {
  return {
    openai: { status: "running" },
    anthropic: { status: "running" },
    gemini: { status: "running" },
  };
}

export function SynthClient({ userEmail, conversations }: SynthClientProps) {
  const [question, setQuestion] = useState("");
  const [askedQuestion, setAskedQuestion] = useState("");
  const [phase, setPhase] = useState<Phase>("empty");
  const [steps, setSteps] = useState<Record<ProviderName, ProviderStep>>(
    emptySteps,
  );
  const [judging, setJudging] = useState<StepStatus | null>(null);
  const [result, setResult] = useState<FinalPayload | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [toast, setToast] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);

  const abortRef = useRef<AbortController | null>(null);

  async function run(prompt: string) {
    setAskedQuestion(prompt);
    setPhase("loading");
    setSteps(emptySteps());
    setJudging(null);
    setResult(null);
    setErrorMsg("");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/synth/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, conversationId: activeConversationId }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        setErrorMsg(
          data?.error ??
            "Impossible de générer une réponse pour le moment. Réessayez dans quelques instants.",
        );
        setPhase("error");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // Lecture du flux NDJSON ligne par ligne.
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          handleEvent(JSON.parse(line));
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // Stop demandé par l'utilisateur : on revient au composer.
        setPhase("empty");
        return;
      }
      setErrorMsg(
        "Impossible de générer une réponse pour le moment. Réessayez dans quelques instants.",
      );
      setPhase("error");
    } finally {
      abortRef.current = null;
    }
  }

  function handleEvent(ev: Record<string, unknown>) {
    switch (ev.type) {
      case "started":
        if (typeof ev.conversationId === "string") {
          setActiveConversationId(ev.conversationId);
        }
        break;
      case "provider_done": {
        const provider = ev.provider as ProviderName;
        setSteps((s) => ({
          ...s,
          [provider]: {
            status: ev.ok ? "ok" : "fail",
            latencyMs: ev.latencyMs as number,
            error: ev.error as string | undefined,
            content: ev.content as string | undefined,
          },
        }));
        break;
      }
      case "judging":
        setJudging("running");
        break;
      case "final":
        setJudging("ok");
        setResult(ev as unknown as FinalPayload);
        setPhase("answer");
        setQuestion("");
        break;
      case "error":
        setErrorMsg(
          (ev.error as string) ??
            "Impossible de générer une réponse pour le moment.",
        );
        setPhase("error");
        break;
    }
  }

  function submit() {
    const q = question.trim();
    if (!q || phase === "loading") return;
    run(q);
  }

  function stop() {
    abortRef.current?.abort();
  }

  // Recharge le dernier échange d'une conversation dans la fenêtre principale.
  async function openConversation(id: string) {
    abortRef.current?.abort();
    setActiveConversationId(id);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/conversations/${id}`);
      if (!res.ok) throw new Error("load failed");
      const data = await res.json();

      if (!data.prompt) {
        setPhase("empty");
        setResult(null);
        setAskedQuestion("");
        return;
      }

      const providers = (data.prompt.providers ?? []) as ProviderView[];
      const newSteps = emptySteps();
      for (const pv of providers) {
        newSteps[pv.provider] = {
          status: pv.ok ? "ok" : "fail",
          latencyMs: pv.latencyMs,
          error: pv.error,
          content: pv.content,
        };
      }
      setSteps(newSteps);

      if (data.prompt.final) {
        setAskedQuestion(data.prompt.content);
        setResult({ conversationId: id, final: data.prompt.final, providers });
        setJudging("ok");
        setPhase("answer");
      } else {
        setPhase("empty");
        setResult(null);
      }
    } catch {
      setErrorMsg("Impossible de charger la conversation.");
      setPhase("error");
    }
  }

  function newQuestion(freshConversation = false) {
    abortRef.current?.abort();
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
      /* presse-papiers indisponible */
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

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="synth-scroll hidden w-[248px] flex-shrink-0 flex-col overflow-y-auto border-r border-border-soft bg-surface-soft lg:flex">
        <div className="px-4 pb-[10px] pt-4">
          <button
            onClick={() => newQuestion(true)}
            className="flex h-[42px] w-full items-center gap-[9px] rounded-md bg-primary px-[14px] text-[14px] font-semibold tracking-[-0.01em] text-primary-fg shadow-glow transition hover:opacity-90"
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
              onClick={() => openConversation(c.id)}
              title={c.title}
              className={`truncate rounded-[9px] px-3 py-[10px] text-left text-[13.5px] leading-[1.4] transition hover:bg-white/[.04] ${
                activeConversationId === c.id
                  ? "bg-white/[.05] text-foreground"
                  : "text-muted-fg"
              }`}
            >
              {c.title}
            </button>
          ))}
        </div>
        <div className="mt-auto flex items-center justify-between border-t border-border-soft px-4 py-[14px]">
          <div className="flex min-w-0 items-center gap-[9px]">
            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-accent-soft text-[12px] font-semibold text-accent-strong">
              {initials(userEmail)}
            </span>
            <span className="truncate text-[13px] text-muted-fg">
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
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border-soft bg-background/85 px-6 py-[14px] backdrop-blur">
          <Logo size={15} />
          <span className="font-mono text-[11px] text-faint">{headerNote}</span>
        </header>

        {phase === "empty" ? (
          <div className="mx-auto flex w-full max-w-[720px] flex-1 flex-col px-6 pb-10 pt-6">
            <div className="animate-synth-rise flex flex-1 flex-col items-center justify-center py-[30px] text-center">
              <div className="mb-5 flex h-[46px] w-[46px] items-center justify-center rounded-[13px] bg-accent-soft shadow-glow">
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
          </div>
        ) : (
          <div className="mx-auto grid w-full max-w-[1060px] flex-1 grid-cols-1 gap-8 px-6 pb-10 pt-6 lg:grid-cols-[1fr_300px]">
            {/* Colonne principale */}
            <div className="min-w-0">
              {phase === "loading" && (
                <div className="flex flex-1 flex-col items-center justify-center py-[40px] text-center">
                  <div className="mb-[22px] flex items-center gap-[7px]">
                    {[0, 0.2, 0.4].map((d) => (
                      <span
                        key={d}
                        className="animate-synth-pulse h-[9px] w-[9px] rounded-full bg-accent shadow-glow"
                        style={{ animationDelay: `${d}s` }}
                      />
                    ))}
                  </div>
                  <p className="m-0 mb-5 text-[17px] font-medium text-foreground">
                    SYNTH confronte les pistes…
                  </p>
                  <div className="relative mb-6 h-1 w-[200px] overflow-hidden rounded-full bg-surface-soft">
                    <span className="animate-synth-bar absolute top-0 h-full w-[40%] rounded-full bg-accent shadow-glow" />
                  </div>
                  <button
                    onClick={stop}
                    className="h-[38px] rounded-md border border-border px-[18px] text-[13.5px] font-medium text-muted-fg transition hover:border-danger-border hover:text-danger-fg"
                  >
                    Arrêter
                  </button>
                </div>
              )}

              {phase === "error" && (
                <div className="animate-synth-rise flex flex-1 flex-col items-center justify-center py-[40px] text-center">
                  <div className="w-full max-w-[440px] rounded-xl border border-danger-border bg-danger-bg p-6">
                    <h2 className="m-0 mb-2 text-[17px] font-semibold text-danger-fg">
                      Une erreur est survenue
                    </h2>
                    <p className="m-0 mb-5 text-[14.5px] leading-[1.55] text-muted-fg">
                      {errorMsg}
                    </p>
                    <button
                      onClick={() => {
                        setQuestion(askedQuestion);
                        setPhase("empty");
                      }}
                      className="h-[42px] rounded-md border border-border bg-white/[.04] px-[18px] text-[14px] font-semibold text-foreground transition hover:bg-white/[.07]"
                    >
                      Réessayer
                    </button>
                  </div>
                </div>
              )}

              {phase === "answer" && result && (
                <div className="animate-synth-rise">
                  <div className="mb-[22px] flex items-start gap-[11px] rounded-[13px] border border-border bg-surface px-[17px] py-[15px]">
                    <span className="pt-[2px] font-mono text-[12px] text-faint">
                      Q
                    </span>
                    <span className="text-[15.5px] leading-[1.5] text-[#C6D2CB]">
                      {askedQuestion}
                    </span>
                  </div>

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

                  <h1 className="m-0 mb-4 text-[23px] font-semibold leading-[1.25] tracking-[-0.02em] text-foreground">
                    {result.final.title}
                  </h1>

                  <div className="text-[16px] leading-[1.65] text-[#B8C5BD]">
                    <p className="m-0 mb-4 whitespace-pre-wrap">
                      {result.final.finalAnswer}
                    </p>

                    {result.final.keyPoints.length > 0 && (
                      <>
                        <p className="m-0 mb-2 text-[15px] font-semibold text-foreground">
                          Points clés
                        </p>
                        <ul className="m-0 mb-5 list-disc pl-5 text-muted-fg">
                          {result.final.keyPoints.map((p, i) => (
                            <li key={i} className="mb-[7px]">
                              {p}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>

                  {result.final.disagreements.length > 0 && (
                    <details className="mb-6 rounded-lg border border-border bg-surface-soft px-4 py-[14px]">
                      <summary className="flex cursor-pointer list-none items-center gap-2 text-[14px] font-medium text-muted-fg">
                        <span className="text-accent">◇</span> Une nuance a été
                        retenue
                      </summary>
                      <div className="mt-3 space-y-2 text-[14.5px] leading-[1.55] text-muted-fg">
                        {result.final.disagreements.map((d, i) => (
                          <p key={i} className="m-0">
                            {d}
                          </p>
                        ))}
                      </div>
                    </details>
                  )}

                  <div className="flex gap-[9px]">
                    <button
                      onClick={() => newQuestion(false)}
                      className="h-[42px] rounded-md border border-border bg-white/[.04] px-[18px] text-[14px] font-semibold text-foreground transition hover:bg-white/[.07]"
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

            {/* Colonne « processus » (coulisses) */}
            <aside className="lg:sticky lg:top-[84px] lg:self-start">
              <div className="rounded-xl border border-border bg-surface p-4">
                <p className="mb-4 font-mono text-[11px] tracking-[0.08em] text-faint">
                  LE PROCESSUS
                </p>
                <div className="flex flex-col gap-1">
                  {PROVIDER_ORDER.map((p) => {
                    const step = steps[p];
                    return (
                      <ProcessRow
                        key={p}
                        label={PROVIDER_LABEL[p]}
                        status={step.status}
                        latencyMs={step.latencyMs}
                        content={step.content}
                        error={step.error}
                        showDetail={phase === "answer"}
                      />
                    );
                  })}
                  {/* Étape de synthèse (le Juge) */}
                  <div className="mt-1 flex items-center gap-3 border-t border-border-soft pt-3">
                    <StatusDot
                      status={
                        judging === "ok"
                          ? "ok"
                          : judging === "running"
                            ? "running"
                            : "running"
                      }
                      idle={judging === null}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="m-0 text-[13.5px] font-medium text-foreground">
                        Synthèse
                      </p>
                      <p className="m-0 text-[12px] text-faint">
                        {judging === "ok"
                          ? "réponse finale prête"
                          : judging === "running"
                            ? "confronte et vérifie…"
                            : "en attente"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}

        {/* Composer */}
        {showComposer && (
          <div className="sticky bottom-0 bg-gradient-to-t from-background from-70% to-transparent px-6 pb-[22px] pt-[14px]">
            <div className="mx-auto max-w-[720px]">
              <div className="rounded-xl border border-border bg-surface p-2 shadow-composer focus-within:border-[rgba(43,245,168,.5)]">
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
                  disabled={phase === "loading"}
                  className="w-full resize-none bg-transparent px-3 pb-1 pt-[10px] text-[16px] leading-[1.5] text-foreground outline-none placeholder:text-faint disabled:opacity-50"
                />
                <div className="flex items-center justify-between px-[6px] pb-[2px] pt-1">
                  <span className="font-mono text-[11px] text-faint">
                    Entrée pour envoyer
                  </span>
                  <button
                    onClick={submit}
                    disabled={!question.trim() || phase === "loading"}
                    className={`h-9 rounded-md px-4 text-[14px] font-semibold tracking-[-0.01em] transition ${
                      !question.trim() || phase === "loading"
                        ? "cursor-not-allowed bg-surface-soft text-faint"
                        : "bg-primary text-primary-fg shadow-glow hover:opacity-90"
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

function StatusDot({
  status,
  idle = false,
}: {
  status: StepStatus;
  idle?: boolean;
}) {
  if (idle) {
    return <span className="h-[9px] w-[9px] rounded-full bg-border" />;
  }
  if (status === "running") {
    return (
      <span className="animate-synth-pulse h-[9px] w-[9px] rounded-full bg-accent shadow-glow" />
    );
  }
  if (status === "ok") {
    return (
      <span className="h-[9px] w-[9px] rounded-full bg-accent shadow-glow" />
    );
  }
  return <span className="h-[9px] w-[9px] rounded-full bg-danger-fg" />;
}

function ProcessRow({
  label,
  status,
  latencyMs,
  content,
  error,
  showDetail,
}: {
  label: string;
  status: StepStatus;
  latencyMs?: number;
  content?: string;
  error?: string;
  showDetail: boolean;
}) {
  const statusText =
    status === "ok" && latencyMs
      ? `a répondu · ${(latencyMs / 1000).toFixed(1)}s`
      : status === "fail"
        ? "indisponible"
        : STATUS_TEXT[status];

  const canExpand = showDetail && status === "ok" && Boolean(content);

  return (
    <div className="flex items-start gap-3 py-2">
      <span className="pt-[3px]">
        <StatusDot status={status} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="m-0 text-[13.5px] font-medium text-foreground">{label}</p>
        <p
          className={`m-0 text-[12px] ${
            status === "fail" ? "text-danger-fg" : "text-faint"
          }`}
          title={error}
        >
          {statusText}
        </p>
        {canExpand && (
          <details className="mt-2">
            <summary className="cursor-pointer list-none text-[11.5px] text-accent-strong">
              voir sa piste
            </summary>
            <p className="mt-1 max-h-[180px] overflow-y-auto whitespace-pre-wrap text-[12.5px] leading-[1.5] text-muted-fg">
              {content}
            </p>
          </details>
        )}
      </div>
    </div>
  );
}
