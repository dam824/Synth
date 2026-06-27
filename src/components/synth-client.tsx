"use client";

import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

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

interface ConvItem {
  id: string;
  title: string;
  pinned: boolean;
  archived: boolean;
  projectId: string | null;
  updatedAt: string;
}

interface Project {
  id: string;
  name: string;
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

  // Sidebar : conversations + projets gérés côté client.
  const [convos, setConvos] = useState<ConvItem[]>(() =>
    conversations.map((c) => ({
      id: c.id,
      title: c.title,
      pinned: false,
      archived: false,
      projectId: null,
      updatedAt: c.updatedAt,
    })),
  );
  const [projects, setProjects] = useState<Project[]>([]);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  async function refreshSidebar() {
    try {
      const [cRes, pRes] = await Promise.all([
        fetch("/api/conversations"),
        fetch("/api/projects"),
      ]);
      if (cRes.ok) setConvos((await cRes.json()).conversations ?? []);
      if (pRes.ok) setProjects((await pRes.json()).projects ?? []);
    } catch {
      /* hors-ligne : on garde l'état courant */
    }
  }

  useEffect(() => {
    refreshSidebar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        // Rafraîchit la liste pour faire apparaître la nouvelle conversation.
        refreshSidebar();
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

  async function openConversation(id: string) {
    abortRef.current?.abort();
    setMenuId(null);
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

  // ----- Actions de gestion des conversations -----

  async function patchConv(id: string, body: Partial<ConvItem>) {
    setConvos((cs) => cs.map((c) => (c.id === id ? { ...c, ...body } : c)));
    await fetch(`/api/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => {});
  }

  function togglePin(c: ConvItem) {
    setMenuId(null);
    patchConv(c.id, { pinned: !c.pinned });
  }

  function setArchived(c: ConvItem, archived: boolean) {
    setMenuId(null);
    patchConv(c.id, { archived });
    if (archived && activeConversationId === c.id) newQuestion(true);
  }

  function moveToProject(c: ConvItem, projectId: string | null) {
    setMenuId(null);
    patchConv(c.id, { projectId });
  }

  function startRename(c: ConvItem) {
    setMenuId(null);
    setRenameValue(c.title);
    setRenamingId(c.id);
  }

  function commitRename() {
    if (!renamingId) return;
    const value = renameValue.trim();
    if (value) patchConv(renamingId, { title: value });
    setRenamingId(null);
  }

  async function deleteConv(c: ConvItem) {
    setMenuId(null);
    if (!window.confirm("Supprimer définitivement cette conversation ?")) return;
    setConvos((cs) => cs.filter((x) => x.id !== c.id));
    if (activeConversationId === c.id) newQuestion(true);
    await fetch(`/api/conversations/${c.id}`, { method: "DELETE" }).catch(
      () => {},
    );
  }

  async function createProject() {
    const name = window.prompt("Nom du projet", "Nouveau projet");
    if (name === null) return;
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const { project } = await res.json();
        setProjects((ps) => [...ps, project]);
      }
    } catch {
      /* ignore */
    }
  }

  async function deleteProject(p: Project) {
    if (
      !window.confirm(
        `Supprimer le projet « ${p.name} » ? Les conversations seront conservées.`,
      )
    )
      return;
    setProjects((ps) => ps.filter((x) => x.id !== p.id));
    setConvos((cs) =>
      cs.map((c) => (c.projectId === p.id ? { ...c, projectId: null } : c)),
    );
    await fetch(`/api/projects/${p.id}`, { method: "DELETE" }).catch(() => {});
  }

  function openMenu(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuPos({
      top: r.bottom + 4,
      left: Math.min(r.left - 200, window.innerWidth - 236),
    });
    setMenuId(menuId === id ? null : id);
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

  const pinned = convos.filter((c) => c.pinned && !c.archived);
  const archivedList = convos.filter((c) => c.archived);
  const loose = convos.filter(
    (c) => !c.archived && !c.pinned && !c.projectId,
  );
  const menuConv = menuId ? convos.find((c) => c.id === menuId) : null;

  // Ligne de conversation (réutilisée dans chaque section).
  const renderConv = (c: ConvItem) => {
    if (renamingId === c.id) {
      return (
        <input
          key={c.id}
          autoFocus
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") setRenamingId(null);
          }}
          className="w-full rounded-[9px] border border-accent/40 bg-surface px-3 py-[9px] text-[13.5px] text-foreground outline-none"
        />
      );
    }
    return (
      <div key={c.id} className="group relative flex items-center">
        <button
          onClick={() => openConversation(c.id)}
          title={c.title}
          className={`flex-1 truncate rounded-[9px] px-3 py-[10px] text-left text-[13.5px] leading-[1.4] transition hover:bg-white/[.04] ${
            activeConversationId === c.id
              ? "bg-white/[.05] text-foreground"
              : "text-muted-fg"
          }`}
        >
          {c.pinned && <span className="mr-1 text-accent-strong">★</span>}
          {c.title}
        </button>
        <button
          onClick={(e) => openMenu(e, c.id)}
          title="Options"
          className={`absolute right-1 flex h-7 w-7 items-center justify-center rounded-md text-faint transition hover:bg-white/[.08] hover:text-foreground ${
            menuId === c.id ? "flex" : "hidden group-hover:flex"
          }`}
        >
          ⋯
        </button>
      </div>
    );
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="synth-scroll hidden w-[248px] flex-shrink-0 flex-col overflow-y-auto border-r border-border-soft bg-surface-soft lg:flex">
        <div className="space-y-2 px-4 pb-[10px] pt-4">
          <button
            onClick={() => newQuestion(true)}
            className="flex h-[42px] w-full items-center gap-[9px] rounded-md bg-primary px-[14px] text-[14px] font-semibold tracking-[-0.01em] text-primary-fg shadow-glow transition hover:opacity-90"
          >
            <span className="text-[17px] font-normal leading-none">+</span>{" "}
            Nouvelle question
          </button>
          <button
            onClick={createProject}
            className="flex h-[34px] w-full items-center gap-[8px] rounded-md border border-border px-[12px] text-[13px] font-medium text-muted-fg transition hover:bg-white/[.04] hover:text-foreground"
          >
            <span className="text-[15px] leading-none">+</span> Nouveau projet
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {/* Épinglées */}
          {pinned.length > 0 && (
            <Section title="ÉPINGLÉES">{pinned.map(renderConv)}</Section>
          )}

          {/* Projets */}
          {projects.map((p) => {
            const items = convos.filter(
              (c) => c.projectId === p.id && !c.archived && !c.pinned,
            );
            return (
              <div key={p.id} className="mb-1 mt-3">
                <div className="group/proj flex items-center justify-between px-3 pb-[4px]">
                  <span className="flex items-center gap-[6px] font-mono text-[11px] tracking-[0.04em] text-faint">
                    <span>🗂</span>
                    <span className="truncate">{p.name}</span>
                  </span>
                  <button
                    onClick={() => deleteProject(p)}
                    title="Supprimer le projet"
                    className="hidden text-[12px] text-faint hover:text-danger-fg group-hover/proj:block"
                  >
                    ✕
                  </button>
                </div>
                {items.length === 0 ? (
                  <p className="px-3 py-1 text-[12px] text-faint/70">
                    Glissez une conversation ici via « ⋯ ».
                  </p>
                ) : (
                  items.map(renderConv)
                )}
              </div>
            );
          })}

          {/* Récentes */}
          <Section title="RÉCENTES">
            {loose.length === 0 ? (
              <p className="px-3 text-[13px] text-faint">Aucune question.</p>
            ) : (
              loose.map(renderConv)
            )}
          </Section>

          {/* Archivées */}
          {archivedList.length > 0 && (
            <div className="mt-3">
              <button
                onClick={() => setShowArchived((v) => !v)}
                className="flex w-full items-center justify-between px-3 py-1 font-mono text-[11px] tracking-[0.04em] text-faint hover:text-muted-fg"
              >
                <span>ARCHIVÉES ({archivedList.length})</span>
                <span>{showArchived ? "▾" : "▸"}</span>
              </button>
              {showArchived && archivedList.map(renderConv)}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border-soft px-4 py-[14px]">
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

            {/* Colonne « processus » */}
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
                  <div className="mt-1 flex items-center gap-3 border-t border-border-soft pt-3">
                    <StatusDot
                      status={judging === "ok" ? "ok" : "running"}
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

      {/* Menu contextuel d'une conversation */}
      {menuConv && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuId(null)} />
          <div
            className="fixed z-50 w-[224px] rounded-xl border border-border bg-surface p-1 shadow-card"
            style={{ top: menuPos.top, left: menuPos.left }}
            onClick={(e) => e.stopPropagation()}
          >
            <MenuItem onClick={() => togglePin(menuConv)}>
              {menuConv.pinned ? "★ Retirer l'épingle" : "★ Épingler"}
            </MenuItem>
            <MenuItem onClick={() => startRename(menuConv)}>
              ✎ Renommer
            </MenuItem>

            {(projects.length > 0 || menuConv.projectId) && (
              <div className="my-1 border-t border-border-soft pt-1">
                <p className="px-3 py-1 font-mono text-[10px] tracking-[0.06em] text-faint">
                  DÉPLACER VERS
                </p>
                {menuConv.projectId && (
                  <MenuItem onClick={() => moveToProject(menuConv, null)}>
                    ↩ Sans projet
                  </MenuItem>
                )}
                {projects
                  .filter((p) => p.id !== menuConv.projectId)
                  .map((p) => (
                    <MenuItem
                      key={p.id}
                      onClick={() => moveToProject(menuConv, p.id)}
                    >
                      🗂 {p.name}
                    </MenuItem>
                  ))}
              </div>
            )}

            <div className="my-1 border-t border-border-soft pt-1">
              <MenuItem onClick={() => setArchived(menuConv, !menuConv.archived)}>
                {menuConv.archived ? "⊡ Désarchiver" : "⊟ Archiver"}
              </MenuItem>
              <MenuItem danger onClick={() => deleteConv(menuConv)}>
                🗑 Supprimer
              </MenuItem>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-3">
      <div className="px-3 pb-[4px] font-mono text-[11px] tracking-[0.06em] text-faint">
        {title}
      </div>
      <div className="flex flex-col gap-[2px]">{children}</div>
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  danger = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`block w-full truncate rounded-md px-3 py-[8px] text-left text-[13.5px] transition hover:bg-white/[.05] ${
        danger ? "text-danger-fg" : "text-foreground"
      }`}
    >
      {children}
    </button>
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
