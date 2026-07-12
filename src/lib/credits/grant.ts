import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function grantCredits(options: {
  userId: string;
  amount: number;
  type: "subscription_grant" | "free_grant" | "purchase";
  idempotencyKey: string;
  planKey?: string;
  stripeSessionId?: string;
  stripePaymentId?: string;
  stripeInvoiceId?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  if (!Number.isInteger(options.amount) || options.amount <= 0) {
    throw new Error("Le montant de crédits doit être un entier positif.");
  }

  return prisma.$transaction(async (tx) => {
    const existing = await tx.creditLedger.findUnique({
      where: { idempotencyKey: options.idempotencyKey },
    });
    if (existing) return existing;

    await tx.wallet.upsert({
      where: { userId: options.userId },
      create: { userId: options.userId },
      update: {},
    });

    const locked = await tx.$queryRaw<Array<{ balance: number }>>`
      SELECT "balance" FROM "Wallet" WHERE "userId" = ${options.userId} FOR UPDATE
    `;
    const balance = locked[0]?.balance;
    if (balance === undefined) throw new Error("Portefeuille introuvable.");

    const balanceAfter = balance + options.amount;
    await tx.wallet.update({
      where: { userId: options.userId },
      data: {
        balance: balanceAfter,
        lifetimePurchased:
          options.type === "free_grant" ? undefined : { increment: options.amount },
      },
    });

    return tx.creditLedger.create({
      data: {
        userId: options.userId,
        type: options.type,
        amount: options.amount,
        balanceAfter,
        planKey: options.planKey,
        stripeSessionId: options.stripeSessionId,
        stripePaymentId: options.stripePaymentId,
        stripeInvoiceId: options.stripeInvoiceId,
        idempotencyKey: options.idempotencyKey,
        metadata: options.metadata,
      },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
