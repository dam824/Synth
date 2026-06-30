import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SynthClient } from "@/components/synth-client";

function isDatabaseUnavailable(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const maybeError = error as { code?: string; message?: string };
  return (
    maybeError.code === "P1001" ||
    maybeError.message?.includes("Can't reach database server") === true
  );
}

// Interface principale, protégée par le middleware.
export default async function AppPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Historique minimal : les conversations récentes de l'utilisateur.
  const conversations = await prisma.conversation
    .findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: { id: true, title: true, updatedAt: true },
    })
    .catch((error: unknown) => {
      if (isDatabaseUnavailable(error)) return [];
      throw error;
    });

  return (
    <SynthClient
      userEmail={session.user.email ?? ""}
      conversations={conversations.map((c) => ({
        id: c.id,
        title: c.title,
        updatedAt: c.updatedAt.toISOString(),
      }))}
    />
  );
}
