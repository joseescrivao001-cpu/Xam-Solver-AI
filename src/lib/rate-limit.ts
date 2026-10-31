/**
 * Limitação de pedidos e quota de convidado.
 *
 * LIMITAÇÃO CONHECIDA (documentada de propósito): o contador em memória vive
 * no processo de cada instância serverless. Em produção multi-instância isto
 * atenua abuso trivial (loops de um só cliente), mas não é um limite global.
 * Para um limite estritamente global, substituir `hit()` por Redis (Upstash)
 * ou por uma tabela de contadores com RPC atómica. A interface mantém-se.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 10_000;

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function hit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();

  if (buckets.size > MAX_KEYS) {
    prune(now);
    if (buckets.size > MAX_KEYS) buckets.clear();
  }

  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  if (current.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  return { ok: true, remaining: limit - current.count, retryAfterSeconds: 0 };
}

function prune(now: number) {
  buckets.forEach((bucket, key) => {
    if (bucket.resetAt <= now) buckets.delete(key);
  });
}

/** Identificador estável do cliente para efeitos de limite. */
export function clientKey(request: Request, userId?: string | null): string {
  if (userId) return `u:${userId}`;
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  return `ip:${ip}`;
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Remaining": String(result.remaining),
  };
  if (!result.ok) headers["Retry-After"] = String(result.retryAfterSeconds);
  return headers;
}
