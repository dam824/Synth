import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { readStoredContent } from "@/lib/security/crypto";

// Export RGPD : l'utilisateur télécharge l'intégralité de ses conversations
// (déchiffrées, car ce sont ses propres données).
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const userId = session.user.id;

  const conversations = await prisma.conversation.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: {
      prompts: {
        orderBy: { createdAt: "asc" },
        include: { finalAnswer: true, modelResponses: true },
      },
    },
  });

  const data = {
    exportedAt: new Date().toISOString(),
    user: { id: userId, email: session.user.email ?? null },
    conversations: conversations.map((c) => ({
      id: c.id,
      title: c.title,
      createdAt: c.createdAt.toISOString(),
      prompts: c.prompts.map((p) => ({
        createdAt: p.createdAt.toISOString(),
        question: readStoredContent(p),
        finalAnswer: p.finalAnswer ? readStoredContent(p.finalAnswer) : null,
        confidence: p.finalAnswer?.confidence ?? null,
      })),
    })),
  };

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="synth-export.json"',
    },
  });
}
