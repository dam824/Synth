import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Chiffrement applicatif des contenus de conversation, AES-256-GCM.
// Source unique : aucune route ne doit dupliquer cette logique.
//
// Stockage : 3 colonnes par champ chiffré
//   - contentEncrypted : "<tagBase64>:<cipherBase64>"
//   - contentNonce     : nonce 12 octets en base64
//   - contentKeyVersion : version de clé (rotation future)
// Les anciens enregistrements gardent leur valeur en clair dans `content` :
// la lecture retombe dessus si aucune donnée chiffrée n'est présente.

const ALGO = "aes-256-gcm";
const CURRENT_KEY_VERSION = 1;

export interface EncryptedField {
  contentEncrypted: string;
  contentNonce: string;
  contentKeyVersion: number;
}

// Forme commune des colonnes de stockage (clair + chiffré).
export interface StoredContent {
  content: string | null;
  contentEncrypted: string | null;
  contentNonce: string | null;
  contentKeyVersion: number;
}

// Le chiffrement est actif uniquement si une clé est configurée. Sinon on
// reste en clair (utile en développement local sans clé).
export function isEncryptionEnabled(): boolean {
  return Boolean(process.env.CONVERSATION_ENCRYPTION_KEY);
}

function loadKey(version: number): Buffer {
  // Pour l'instant une seule version de clé ; la rotation lira des clés
  // versionnées (CONVERSATION_ENCRYPTION_KEY_V2, …) le moment venu.
  const raw = process.env.CONVERSATION_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("CONVERSATION_ENCRYPTION_KEY manquante");
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      "CONVERSATION_ENCRYPTION_KEY doit être 32 octets encodés en base64",
    );
  }
  if (version !== CURRENT_KEY_VERSION) {
    throw new Error(`Version de clé inconnue : ${version}`);
  }
  return key;
}

export function encryptText(plain: string): EncryptedField {
  const key = loadKey(CURRENT_KEY_VERSION);
  const nonce = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, nonce);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    contentEncrypted: `${tag.toString("base64")}:${enc.toString("base64")}`,
    contentNonce: nonce.toString("base64"),
    contentKeyVersion: CURRENT_KEY_VERSION,
  };
}

export function decryptText(field: EncryptedField): string {
  const key = loadKey(field.contentKeyVersion);
  const [tagB64, cipherB64] = field.contentEncrypted.split(":");
  if (!tagB64 || !cipherB64) {
    throw new Error("Payload chiffré invalide");
  }
  const decipher = createDecipheriv(
    ALGO,
    key,
    Buffer.from(field.contentNonce, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(cipherB64, "base64")),
    decipher.final(),
  ]);
  return dec.toString("utf8");
}

// Prépare les colonnes à écrire pour un contenu donné.
// - chiffrement actif : `content` = null, colonnes chiffrées remplies.
// - sinon : `content` en clair (legacy / dev).
export function writeStoredContent(plain: string): StoredContent {
  if (!isEncryptionEnabled()) {
    return {
      content: plain,
      contentEncrypted: null,
      contentNonce: null,
      contentKeyVersion: CURRENT_KEY_VERSION,
    };
  }
  const enc = encryptText(plain);
  return {
    content: null,
    contentEncrypted: enc.contentEncrypted,
    contentNonce: enc.contentNonce,
    contentKeyVersion: enc.contentKeyVersion,
  };
}

// Lit un contenu : déchiffre si présent, sinon retombe sur le clair legacy.
export function readStoredContent(row: {
  content: string | null;
  contentEncrypted: string | null;
  contentNonce: string | null;
  contentKeyVersion: number;
}): string {
  if (row.contentEncrypted && row.contentNonce) {
    try {
      return decryptText({
        contentEncrypted: row.contentEncrypted,
        contentNonce: row.contentNonce,
        contentKeyVersion: row.contentKeyVersion,
      });
    } catch {
      // Clé absente/incorrecte : on ne fuite pas le contenu.
      return "";
    }
  }
  return row.content ?? "";
}
