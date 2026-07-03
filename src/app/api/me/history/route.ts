import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Supprime TOUT l'historique de l'utilisateur (conversations + prompts +
// réponses, en cascade via les relations Prisma).
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { count } = await prisma.conversation.deleteMany({
    where: { userId: session.user.id },
  });

  return NextResponse.json({ ok: true, deleted: count });
}
