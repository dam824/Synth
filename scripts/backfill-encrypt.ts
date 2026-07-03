// Backfill idempotent : chiffre les contenus laissés en clair (anciens
// enregistrements) puis vide la colonne `content`.
//
// Lancer :  npx tsx scripts/backfill-encrypt.ts
// Prérequis : CONVERSATION_ENCRYPTION_KEY définie dans .env (sinon on refuse).
//
// Idempotent : ne traite que les lignes ayant `content` non nul ET
// `contentEncrypted` nul. Relançable sans risque.

import { prisma } from "../src/lib/prisma";
import { encryptText, isEncryptionEnabled } from "../src/lib/security/crypto";

const BATCH = 200;

async function backfillModel(
  label: string,
  find: (take: number) => Promise<{ id: string; content: string | null }[]>,
  update: (id: string, enc: ReturnType<typeof encryptText>) => Promise<unknown>,
): Promise<number> {
  let total = 0;
  for (;;) {
    const rows = await find(BATCH);
    if (rows.length === 0) break;
    for (const row of rows) {
      if (!row.content) continue;
      const enc = encryptText(row.content);
      await update(row.id, enc);
      total += 1;
    }
    process.stdout.write(`  ${label}: ${total} traités\r`);
    if (rows.length < BATCH) break;
  }
  console.log(`  ${label}: ${total} chiffrés.`);
  return total;
}

async function main() {
  if (!isEncryptionEnabled()) {
    console.error(
      "CONVERSATION_ENCRYPTION_KEY absente : rien à faire (mode clair).",
    );
    process.exit(1);
  }

  console.log("Backfill du chiffrement des contenus…");

  await backfillModel(
    "Prompt",
    (take) =>
      prisma.prompt.findMany({
        where: { content: { not: null }, contentEncrypted: null },
        select: { id: true, content: true },
        take,
      }),
    (id, enc) =>
      prisma.prompt.update({
        where: { id },
        data: {
          content: null,
          contentEncrypted: enc.contentEncrypted,
          contentNonce: enc.contentNonce,
          contentKeyVersion: enc.contentKeyVersion,
        },
      }),
  );

  await backfillModel(
    "ModelResponse",
    (take) =>
      prisma.modelResponse.findMany({
        where: { content: { not: null }, contentEncrypted: null },
        select: { id: true, content: true },
        take,
      }),
    (id, enc) =>
      prisma.modelResponse.update({
        where: { id },
        data: {
          content: null,
          contentEncrypted: enc.contentEncrypted,
          contentNonce: enc.contentNonce,
          contentKeyVersion: enc.contentKeyVersion,
        },
      }),
  );

  await backfillModel(
    "FinalAnswer",
    (take) =>
      prisma.finalAnswer.findMany({
        where: { content: { not: null }, contentEncrypted: null },
        select: { id: true, content: true },
        take,
      }),
    (id, enc) =>
      prisma.finalAnswer.update({
        where: { id },
        data: {
          content: null,
          contentEncrypted: enc.contentEncrypted,
          contentNonce: enc.contentNonce,
          contentKeyVersion: enc.contentKeyVersion,
        },
      }),
  );

  console.log("Terminé.");
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
