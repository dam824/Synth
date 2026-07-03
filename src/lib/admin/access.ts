import type { AdminAuditAction } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Point d'entrée unique pour l'accès admin :
//  - détermine si l'utilisateur courant est admin (rôle DB OU allowlist email) ;
//  - journalise toute action sensible (append-only).
// Aucune route admin ne doit court-circuiter ce module.

export interface AdminContext {
  userId: string;
  email: string | null;
}

function allowlist(): string[] {
  return (process.env.ADMIN_EMAIL_ALLOWLIST ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

// Renvoie le contexte admin si l'utilisateur connecté est autorisé, sinon null.
export async function getAdminContext(): Promise<AdminContext | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const email = session.user.email ?? null;
  const emailAllowed = email
    ? allowlist().includes(email.toLowerCase())
    : false;

  // Rôle porté par la session (JWT) : évite une requête DB. Repli sur la base
  // si l'info n'est pas encore dans le token (anciennes sessions).
  let roleAllowed =
    session.user.role === "ADMIN" || session.user.role === "SUPPORT";
  if (!roleAllowed && !emailAllowed) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      roleAllowed = user?.role === "ADMIN" || user?.role === "SUPPORT";
    } catch {
      roleAllowed = false;
    }
  }

  if (!emailAllowed && !roleAllowed) return null;
  return { userId, email };
}

// Écrit une entrée d'audit. À appeler pour toute action admin sensible.
export async function recordAudit(opts: {
  admin: AdminContext;
  action: AdminAuditAction;
  targetUserId?: string | null;
  conversationId?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  await prisma.adminAuditLog.create({
    data: {
      adminId: opts.admin.userId,
      adminEmail: opts.admin.email,
      targetUserId: opts.targetUserId ?? null,
      conversationId: opts.conversationId ?? null,
      action: opts.action,
      reason: opts.reason ?? null,
      metadata: opts.metadata ? JSON.stringify(opts.metadata) : null,
    },
  });
}
