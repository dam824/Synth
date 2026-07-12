"use client";

import { useEffect, useState } from "react";

import { Logo } from "@/components/brand";

interface Overview {
  users: number;
  conversations: number;
  prompts: number;
  providerErrors: number;
  safetyEvents: number;
  activeSubscribers: number;
  creditsAvailable: number;
  creditsGranted: number;
  creditsSpentThisMonth: number;
}

interface ConversationRow {
  id: string;
  title: string;
  updatedAt: string;
  userEmail: string | null;
  suspended: boolean;
  promptCount: number;
  providers?: { provider: string; ok: boolean; latencyMs: number | null }[];
  confidence: string | null;
}

interface AuditEntry {
  id: string;
  adminEmail: string | null;
  action: string;
  conversationId: string | null;
  targetUserId: string | null;
  reason: string | null;
  createdAt: string;
}

interface RevealedPrompt {
  id: string;
  createdAt: string;
  content: string;
  finalAnswer: string | null;
}

interface ConversationDetail {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  userEmail: string | null;
  prompts: {
    id: string;
    createdAt: string;
    confidence: string | null;
    providers: {
      provider: string;
      model: string | null;
      ok: boolean;
      error: string | null;
      latencyMs: number | null;
    }[];
  }[];
}

type Tab = "conversations" | "users" | "audit";

interface UserRow {
  id: string;
  email: string | null;
  role: string;
  suspended: boolean;
  conversationCount: number;
  plan: string;
  subscriptionStatus: string | null;
  creditBalance: number;
  creditsSpentThisMonth: number;
  lifetimeSpent: number;
  createdAt: string;
}

export function AdminDashboard({ adminEmail }: { adminEmail: string }) {
  const [tab, setTab] = useState<Tab>("conversations");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [filter, setFilter] = useState("");

  // Modale break-glass
  const [revealTarget, setRevealTarget] = useState<ConversationRow | null>(null);
  const [reason, setReason] = useState("");
  const [revealing, setRevealing] = useState(false);
  const [revealed, setRevealed] = useState<RevealedPrompt[] | null>(null);
  const [revealError, setRevealError] = useState("");

  // Détail metadata-only
  const [detailTarget, setDetailTarget] = useState<ConversationRow | null>(null);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  // Suppression auditée
  const [deleteTarget, setDeleteTarget] = useState<ConversationRow | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch("/api/admin/overview")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setOverview(d))
      .catch(() => {});
    fetch("/api/admin/conversations")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setConversations(d.conversations ?? []))
      .catch(() => {});
  }, []);

  function openAudit() {
    setTab("audit");
    fetch("/api/admin/audit-log")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setAudit(d.entries ?? []))
      .catch(() => {});
  }

  function openUsers() {
    setTab("users");
    fetch("/api/admin/users")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setUsers(d.users ?? []))
      .catch(() => {});
  }

  async function toggleSuspend(u: UserRow) {
    const next = !u.suspended;
    if (
      next &&
      !window.confirm(`Suspendre le compte ${u.email ?? u.id} ?`)
    )
      return;
    setUsers((us) =>
      us.map((x) => (x.id === u.id ? { ...x, suspended: next } : x)),
    );
    await fetch(`/api/admin/users/${u.id}/suspend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suspended: next }),
    }).catch(() => {});
  }

  function startReveal(c: ConversationRow) {
    setRevealTarget(c);
    setReason("");
    setRevealed(null);
    setRevealError("");
  }

  async function openDetail(c: ConversationRow) {
    setDetailTarget(c);
    setDetail(null);
    setDetailError("");
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/conversations/${c.id}`);
      const data = await res.json();
      if (!res.ok) {
        setDetailError(data?.error ?? "Impossible de charger le détail.");
        return;
      }
      setDetail(data as ConversationDetail);
    } catch {
      setDetailError("Erreur réseau.");
    } finally {
      setDetailLoading(false);
    }
  }

  function startDelete(c: ConversationRow) {
    setDeleteTarget(c);
    setDeleteReason("");
    setDeleteError("");
  }

  async function confirmDelete() {
    if (!deleteTarget || deleteReason.trim().length < 5) {
      setDeleteError("Indiquez une raison (≥ 5 caractères).");
      return;
    }
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/admin/conversations/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: deleteReason.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setDeleteError(data?.error ?? "Suppression impossible.");
        return;
      }
      setConversations((items) =>
        items.filter((item) => item.id !== deleteTarget.id),
      );
      if (detailTarget?.id === deleteTarget.id) {
        setDetailTarget(null);
        setDetail(null);
      }
      setDeleteTarget(null);
      if (tab === "audit") openAudit();
    } catch {
      setDeleteError("Erreur réseau.");
    } finally {
      setDeleting(false);
    }
  }

  async function confirmReveal() {
    if (!revealTarget || reason.trim().length < 5) {
      setRevealError("Indiquez une raison (≥ 5 caractères).");
      return;
    }
    setRevealing(true);
    setRevealError("");
    try {
      const res = await fetch(
        `/api/admin/conversations/${revealTarget.id}/break-glass`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: reason.trim() }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setRevealError(data?.error ?? "Échec de la révélation.");
        return;
      }
      setRevealed(data.prompts ?? []);
    } catch {
      setRevealError("Erreur réseau.");
    } finally {
      setRevealing(false);
    }
  }

  const KPIS: { label: string; value: number | undefined }[] = [
    { label: "Utilisateurs", value: overview?.users },
    { label: "Conversations", value: overview?.conversations },
    { label: "Prompts", value: overview?.prompts },
    { label: "Erreurs fournisseur", value: overview?.providerErrors },
    { label: "Événements safety", value: overview?.safetyEvents },
    { label: "Abonnés actifs", value: overview?.activeSubscribers },
    { label: "Crédits disponibles", value: overview?.creditsAvailable },
    { label: "Crédits utilisés ce mois", value: overview?.creditsSpentThisMonth },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="synth-orbs" />
      <div className="relative z-10 mx-auto max-w-[1100px] px-6 py-6">
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size={15} />
            <span className="rounded-full border border-border px-2 py-[2px] font-mono text-[10px] tracking-[0.08em] text-faint">
              ADMIN
            </span>
          </div>
          <span className="font-mono text-[11px] text-faint">{adminEmail}</span>
        </header>

        {/* KPI */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {KPIS.map((k) => (
            <div key={k.label} className="glass rounded-xl p-4">
              <p className="m-0 text-[22px] font-bold tabular-nums text-foreground">
                {k.value ?? "—"}
              </p>
              <p className="m-0 mt-1 text-[11.5px] text-muted-fg">{k.label}</p>
            </div>
          ))}
        </div>

        {/* Onglets */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setTab("conversations")}
            className={`h-9 rounded-md px-4 text-[13px] font-medium transition ${
              tab === "conversations"
                ? "bg-primary text-primary-fg"
                : "border border-border text-muted-fg hover:text-foreground"
            }`}
          >
            Conversations
          </button>
          <button
            onClick={openUsers}
            className={`h-9 rounded-md px-4 text-[13px] font-medium transition ${
              tab === "users"
                ? "bg-primary text-primary-fg"
                : "border border-border text-muted-fg hover:text-foreground"
            }`}
          >
            Utilisateurs
          </button>
          <button
            onClick={openAudit}
            className={`h-9 rounded-md px-4 text-[13px] font-medium transition ${
              tab === "audit"
                ? "bg-primary text-primary-fg"
                : "border border-border text-muted-fg hover:text-foreground"
            }`}
          >
            Journal d&apos;audit
          </button>
        </div>

        {tab === "conversations" && (
          <div className="glass overflow-hidden rounded-xl">
            <div className="border-b border-white/[.06] p-3">
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filtrer par e-mail ou titre…"
                className="h-9 w-full rounded-md border border-border bg-surface px-3 text-[13px] text-foreground outline-none focus:border-[rgba(43,245,168,.5)]"
              />
            </div>
            <div className="grid grid-cols-[1fr_160px_90px_120px_190px] gap-2 border-b border-white/[.06] px-4 py-2 font-mono text-[10.5px] uppercase tracking-[0.06em] text-faint">
              <span>Utilisateur / titre</span>
              <span>Mise à jour</span>
              <span>Prompts</span>
              <span>Confiance</span>
              <span></span>
            </div>
            {conversations.length === 0 && (
              <p className="px-4 py-6 text-center text-[13px] text-faint">
                Aucune conversation.
              </p>
            )}
            {conversations
              .filter((c) => {
                const q = filter.trim().toLowerCase();
                if (!q) return true;
                return (
                  (c.userEmail ?? "").toLowerCase().includes(q) ||
                  c.title.toLowerCase().includes(q)
                );
              })
              .map((c) => (
              <div
                key={c.id}
                className="grid grid-cols-[1fr_160px_90px_120px_190px] items-center gap-2 border-b border-white/[.04] px-4 py-3 text-[13px]"
              >
                <div className="min-w-0">
                  <p className="m-0 truncate text-foreground">
                    {c.userEmail ?? c.id}
                  </p>
                  <p className="m-0 truncate text-[12px] text-faint">
                    {c.title}
                  </p>
                </div>
                <span className="font-mono text-[11px] text-muted-fg">
                  {new Date(c.updatedAt).toLocaleString("fr-FR")}
                </span>
                <span className="text-muted-fg">{c.promptCount}</span>
                <span className="text-muted-fg">{c.confidence ?? "—"}</span>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => openDetail(c)}
                    className="h-8 rounded-md border border-border px-2 text-[12px] text-muted-fg transition hover:border-accent/40 hover:text-foreground"
                  >
                    Détails
                  </button>
                  <button
                    onClick={() => startReveal(c)}
                    className="h-8 rounded-md border border-border px-2 text-[12px] text-muted-fg transition hover:border-danger-border hover:text-danger-fg"
                  >
                    Révéler
                  </button>
                  <button
                    onClick={() => startDelete(c)}
                    className="h-8 rounded-md border border-danger-border px-2 text-[12px] text-danger-fg transition hover:bg-danger-bg"
                  >
                    Suppr.
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "users" && (
          <div className="glass overflow-hidden rounded-xl">
            <div className="grid grid-cols-[minmax(180px,1fr)_90px_110px_100px_100px_90px_120px] gap-2 border-b border-white/[.06] px-4 py-2 font-mono text-[10.5px] uppercase tracking-[0.06em] text-faint">
              <span>E-mail</span>
              <span>Rôle</span>
              <span>Offre</span>
              <span>Solde</span>
              <span>Utilisé</span>
              <span>Convs</span>
              <span></span>
            </div>
            {users.length === 0 && (
              <p className="px-4 py-6 text-center text-[13px] text-faint">
                Aucun utilisateur.
              </p>
            )}
            {users.map((u) => (
              <div
                key={u.id}
                className="grid grid-cols-[minmax(180px,1fr)_90px_110px_100px_100px_90px_120px] items-center gap-2 border-b border-white/[.04] px-4 py-3 text-[13px]"
              >
                <span className="truncate text-foreground">
                  {u.email ?? u.id}
                  {u.suspended && (
                    <span className="ml-2 rounded-full border border-danger-border px-2 py-[1px] text-[10px] text-danger-fg">
                      suspendu
                    </span>
                  )}
                </span>
                <span className="text-muted-fg">{u.role}</span>
                <span className="capitalize text-muted-fg">{u.plan}</span>
                <span className="font-mono text-muted-fg">
                  {u.creditBalance.toLocaleString("fr-FR")}
                </span>
                <span className="font-mono text-muted-fg">
                  {u.creditsSpentThisMonth.toLocaleString("fr-FR")}
                </span>
                <span className="text-muted-fg">{u.conversationCount}</span>
                <button
                  onClick={() => toggleSuspend(u)}
                  className={`h-8 rounded-md border px-2 text-[12px] transition ${
                    u.suspended
                      ? "border-border text-muted-fg hover:text-foreground"
                      : "border-danger-border text-danger-fg hover:bg-danger-bg"
                  }`}
                >
                  {u.suspended ? "Réactiver" : "Suspendre"}
                </button>
              </div>
            ))}
          </div>
        )}

        {tab === "audit" && (
          <div className="glass overflow-hidden rounded-xl">
            {audit.length === 0 && (
              <p className="px-4 py-6 text-center text-[13px] text-faint">
                Aucune entrée d&apos;audit.
              </p>
            )}
            {audit.map((e) => (
              <div
                key={e.id}
                className="border-b border-white/[.04] px-4 py-3 text-[12.5px]"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{e.action}</span>
                  <span className="font-mono text-[11px] text-faint">
                    {new Date(e.createdAt).toLocaleString("fr-FR")}
                  </span>
                </div>
                <p className="m-0 mt-1 text-faint">
                  {e.adminEmail ?? "?"}
                  {e.conversationId ? ` · conv ${e.conversationId.slice(0, 8)}` : ""}
                  {e.reason ? ` · « ${e.reason} »` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modale détail metadata-only */}
      {detailTarget && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60"
            onClick={() => setDetailTarget(null)}
          />
          <div className="glass fixed left-1/2 top-1/2 z-50 w-[min(760px,92vw)] max-h-[82vh] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="m-0 font-mono text-[11px] uppercase tracking-[0.08em] text-accent">
                  Détail metadata
                </p>
                <h2 className="m-0 mt-1 text-[18px] font-semibold text-foreground">
                  {detailTarget.title}
                </h2>
                <p className="m-0 mt-1 text-[13px] text-muted-fg">
                  Aucun contenu conversationnel n&apos;est affiché ici.
                </p>
              </div>
              <button
                onClick={() => setDetailTarget(null)}
                className="h-8 rounded-md border border-border px-3 text-[13px] text-muted-fg hover:text-foreground"
              >
                Fermer
              </button>
            </div>

            {detailLoading && (
              <p className="m-0 mt-5 text-[13px] text-faint">Chargement…</p>
            )}
            {detailError && (
              <p className="m-0 mt-5 text-[13px] text-danger-fg">
                {detailError}
              </p>
            )}
            {detail && (
              <div className="mt-5 space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-border bg-white/[.03] p-3">
                    <p className="m-0 text-[11px] text-faint">Utilisateur</p>
                    <p className="m-0 mt-1 truncate text-[13px] text-foreground">
                      {detail.userEmail ?? detail.userId}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-white/[.03] p-3">
                    <p className="m-0 text-[11px] text-faint">Créée</p>
                    <p className="m-0 mt-1 text-[13px] text-foreground">
                      {new Date(detail.createdAt).toLocaleString("fr-FR")}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-white/[.03] p-3">
                    <p className="m-0 text-[11px] text-faint">Prompts</p>
                    <p className="m-0 mt-1 text-[13px] text-foreground">
                      {detail.prompts.length}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-border">
                  {detail.prompts.map((prompt, index) => (
                    <div
                      key={prompt.id}
                      className="border-b border-white/[.05] p-3 last:border-b-0"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="m-0 font-mono text-[11px] text-faint">
                          Prompt {index + 1} ·{" "}
                          {new Date(prompt.createdAt).toLocaleString("fr-FR")}
                        </p>
                        <span className="rounded-full border border-border px-2 py-[2px] text-[11px] text-muted-fg">
                          confiance {prompt.confidence ?? "—"}
                        </span>
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-3">
                        {prompt.providers.map((provider) => (
                          <div
                            key={`${prompt.id}-${provider.provider}`}
                            className="rounded-lg border border-white/[.06] bg-white/[.025] p-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[12px] font-medium text-foreground">
                                {provider.provider}
                              </span>
                              <span
                                className={`text-[11px] ${
                                  provider.ok ? "text-accent" : "text-danger-fg"
                                }`}
                              >
                                {provider.ok ? "ok" : "erreur"}
                              </span>
                            </div>
                            <p className="m-0 mt-1 truncate text-[11px] text-faint">
                              {provider.model ?? "—"} ·{" "}
                              {provider.latencyMs
                                ? `${(provider.latencyMs / 1000).toFixed(1)}s`
                                : "—"}
                            </p>
                            {provider.error ? (
                              <p className="m-0 mt-1 line-clamp-2 text-[11px] text-danger-fg">
                                {provider.error}
                              </p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => startReveal(detailTarget)}
                    className="h-9 rounded-md border border-danger-border px-4 text-[13px] text-danger-fg hover:bg-danger-bg"
                  >
                    Break-glass
                  </button>
                  <button
                    onClick={() => startDelete(detailTarget)}
                    className="h-9 rounded-md border border-danger-border px-4 text-[13px] text-danger-fg hover:bg-danger-bg"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modale suppression auditée */}
      {deleteTarget && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60"
            onClick={() => setDeleteTarget(null)}
          />
          <div className="glass fixed left-1/2 top-1/2 z-50 w-[min(520px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-2xl p-6">
            <h2 className="m-0 text-[18px] font-semibold text-foreground">
              Supprimer la conversation
            </h2>
            <p className="m-0 mt-1 text-[13px] text-muted-fg">
              Cette action est définitive et journalisée. Indiquez la raison.
            </p>
            <div className="mt-4 rounded-lg border border-border bg-white/[.03] p-3">
              <p className="m-0 truncate text-[13px] text-foreground">
                {deleteTarget.title}
              </p>
              <p className="m-0 mt-1 truncate text-[12px] text-faint">
                {deleteTarget.userEmail ?? deleteTarget.id}
              </p>
            </div>
            <textarea
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              rows={3}
              placeholder="Raison de suppression"
              className="mt-4 w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-[14px] text-foreground outline-none focus:border-[rgba(43,245,168,.5)]"
            />
            {deleteError && (
              <p className="m-0 mt-2 text-[12.5px] text-danger-fg">
                {deleteError}
              </p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="h-9 rounded-md border border-border px-4 text-[13px] text-muted-fg hover:text-foreground"
              >
                Annuler
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="h-9 rounded-md bg-danger-fg px-4 text-[13px] font-semibold text-black disabled:opacity-50"
              >
                {deleting ? "…" : "Supprimer définitivement"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modale break-glass */}
      {revealTarget && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60"
            onClick={() => setRevealTarget(null)}
          />
          <div className="glass fixed left-1/2 top-1/2 z-50 w-[min(640px,92vw)] max-h-[80vh] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl p-6">
            <h2 className="m-0 text-[18px] font-semibold text-foreground">
              Accès au contenu (break-glass)
            </h2>
            <p className="m-0 mt-1 text-[13px] text-muted-fg">
              Cet accès est journalisé. Indiquez la raison de la consultation.
            </p>

            {!revealed ? (
              <>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="Raison (support, abus signalé, demande légale…)"
                  className="mt-4 w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-[14px] text-foreground outline-none focus:border-[rgba(43,245,168,.5)]"
                />
                {revealError && (
                  <p className="m-0 mt-2 text-[12.5px] text-danger-fg">
                    {revealError}
                  </p>
                )}
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    onClick={() => setRevealTarget(null)}
                    className="h-9 rounded-md border border-border px-4 text-[13px] text-muted-fg hover:text-foreground"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={confirmReveal}
                    disabled={revealing}
                    className="h-9 rounded-md bg-danger-fg px-4 text-[13px] font-semibold text-black disabled:opacity-50"
                  >
                    {revealing ? "…" : "Révéler le contenu"}
                  </button>
                </div>
              </>
            ) : (
              <div className="mt-4 space-y-4">
                {revealed.map((p) => (
                  <div key={p.id} className="rounded-lg border border-border p-3">
                    <p className="m-0 mb-1 font-mono text-[11px] text-faint">
                      Q · {new Date(p.createdAt).toLocaleString("fr-FR")}
                    </p>
                    <p className="m-0 whitespace-pre-wrap text-[13.5px] text-foreground">
                      {p.content}
                    </p>
                    {p.finalAnswer && (
                      <p className="m-0 mt-2 whitespace-pre-wrap border-t border-white/[.06] pt-2 text-[13px] text-muted-fg">
                        {p.finalAnswer}
                      </p>
                    )}
                  </div>
                ))}
                <div className="flex justify-end">
                  <button
                    onClick={() => setRevealTarget(null)}
                    className="h-9 rounded-md border border-border px-4 text-[13px] text-muted-fg hover:text-foreground"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
