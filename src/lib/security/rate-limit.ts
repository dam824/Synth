// Limiteur de débit simple, en mémoire (fenêtre glissante par clé).
// Suffisant pour un MVP mono-instance. Pour du multi-instance / prod scalée,
// remplacer par Redis (même interface).

interface Bucket {
  hits: number[];
}

const buckets = new Map<string, Bucket>();

function windowMs(): number {
  const raw = Number(process.env.RATE_LIMIT_WINDOW_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : 60_000;
}

function maxHits(): number {
  const raw = Number(process.env.RATE_LIMIT_MAX);
  return Number.isFinite(raw) && raw > 0 ? raw : 20;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

// Enregistre un appel et indique s'il est autorisé.
export function rateLimit(key: string): RateLimitResult {
  const now = Date.now();
  const win = windowMs();
  const max = maxHits();

  const bucket = buckets.get(key) ?? { hits: [] };
  // Purge les appels hors fenêtre.
  bucket.hits = bucket.hits.filter((t) => now - t < win);

  if (bucket.hits.length >= max) {
    const oldest = bucket.hits[0];
    const retryAfterSec = Math.max(1, Math.ceil((win - (now - oldest)) / 1000));
    buckets.set(key, bucket);
    return { allowed: false, remaining: 0, retryAfterSec };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);
  return {
    allowed: true,
    remaining: max - bucket.hits.length,
    retryAfterSec: 0,
  };
}
