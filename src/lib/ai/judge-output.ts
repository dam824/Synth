// Récupère un champ texte même si une réponse JSON a été interrompue avant sa
// fermeture. Utilisé côté serveur et côté interface pour nettoyer les réponses
// historiques incomplètes.
export function extractJsonStringField(raw: string, field: string): string | null {
  const match = new RegExp(`"${field}"\\s*:\\s*"`).exec(raw);
  if (!match) return null;

  const start = match.index + match[0].length;
  let escaped = false;
  let end = raw.length;
  let closed = false;

  for (let index = start; index < raw.length; index += 1) {
    const char = raw[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === '"') {
      end = index;
      closed = true;
      break;
    }
  }

  let encoded = raw.slice(start, end);
  if (!closed && encoded.endsWith("\\")) encoded = encoded.slice(0, -1);

  try {
    return (JSON.parse(`"${encoded}"`) as string).trim() || null;
  } catch {
    return encoded
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "")
      .replace(/\\t/g, "\t")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\")
      .trim() || null;
  }
}

