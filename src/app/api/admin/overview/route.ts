import { NextResponse } from "next/server";

import { getAdminContext } from "@/lib/admin/access";
import { prisma } from "@/lib/prisma";

// Tableau de bord admin : compteurs globaux, sans aucun contenu de conversation.
export async function GET() {
  const admin = await getAdminContext();
  if (!admin) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const [users, conversations, prompts, providerErrors, safetyEvents] =
    await Promise.all([
      prisma.user.count(),
      prisma.conversation.count(),
      prisma.prompt.count(),
      prisma.modelResponse.count({ where: { success: false } }),
      prisma.safetyLog.count({ where: { decision: { not: "ALLOW" } } }),
    ]);

  return NextResponse.json({
    users,
    conversations,
    prompts,
    providerErrors,
    safetyEvents,
  });
}
