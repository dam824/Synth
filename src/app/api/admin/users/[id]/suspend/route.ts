import { NextResponse } from "next/server";

import { getAdminContext, recordAudit } from "@/lib/admin/access";
import { prisma } from "@/lib/prisma";

// Suspend / réactive un utilisateur. Action auditée.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminContext();
  if (!admin) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  const { id } = await params;

  let body: { suspended?: unknown; reason?: unknown };
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const suspended = body.suspended !== false; // défaut : suspendre
  const reason = typeof body.reason === "string" ? body.reason.trim() : null;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  await prisma.user.update({ where: { id }, data: { suspended } });
  await recordAudit({
    admin,
    action: "SUSPEND_USER",
    targetUserId: id,
    reason,
    metadata: { suspended },
  });

  return NextResponse.json({ ok: true, suspended });
}
