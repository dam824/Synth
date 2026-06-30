import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function isDatabaseUnavailable(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const maybeError = error as { code?: string; message?: string };
  return (
    maybeError.code === "P1001" ||
    maybeError.message?.includes("Can't reach database server") === true
  );
}

// Liste des conversations de l'utilisateur (avec épinglage, archivage, projet).
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const conversations = await prisma.conversation
    .findMany({
      where: { userId: session.user.id },
      orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        title: true,
        pinned: true,
        archived: true,
        projectId: true,
        updatedAt: true,
      },
    })
    .catch((error: unknown) => {
      if (isDatabaseUnavailable(error)) return [];
      throw error;
    });

  return NextResponse.json({
    conversations: conversations.map((c) => ({
      ...c,
      updatedAt: c.updatedAt.toISOString(),
    })),
  });
}
