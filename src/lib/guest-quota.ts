import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Quota de convidado aplicada NO SERVIDOR.
 *
 * Antes, os créditos de convidado viviam em `localStorage` no browser
 * (`guestCredits`), pelo que bastava editar o valor para usar a API de IA
 * sem limite. O contador passa a ser um cookie HttpOnly assinado com HMAC:
 * o browser não consegue forjá-lo nem lê-lo a partir de JavaScript.
 */

const COOKIE_NAME = "esai_guest";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 dias

export const GUEST_FREE_ATTEMPTS = 5;

function secret(): string {
  const candidates = [
    process.env.GUEST_QUOTA_SECRET,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.CEREBRAS_API_KEY,
  ];
  const found = candidates.find((value) => typeof value === "string" && value.trim().length > 0);
  if (found) return found.trim();

  if (process.env.NODE_ENV === "production") {
    console.error(
      "[GUEST_QUOTA] Nenhum segredo disponível (GUEST_QUOTA_SECRET / SUPABASE_SERVICE_ROLE_KEY). " +
        "A quota de convidado está inoperante neste ambiente."
    );
  }
  return "exam-solver-ai-dev-secret";
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

/** Devolve quantos pedidos de convidado já foram feitos (0 se inválido/ausente). */
export function readGuestUsage(request: Request): number {
  const raw = readCookie(request, COOKIE_NAME);
  if (!raw) return 0;

  const [usedRaw, expRaw, signature] = raw.split(".");
  if (!usedRaw || !expRaw || !signature) return 0;

  const used = Number.parseInt(usedRaw, 10);
  const exp = Number.parseInt(expRaw, 10);
  if (!Number.isFinite(used) || !Number.isFinite(exp)) return 0;
  if (exp < Date.now()) return 0;

  const expected = sign(`${used}.${exp}`);
  if (!safeEqual(signature, expected)) return 0;

  return Math.max(0, used);
}

/** Cabeçalho `Set-Cookie` com o novo contador assinado. */
export function guestUsageCookie(used: number): string {
  const exp = Date.now() + MAX_AGE_SECONDS * 1000;
  const clamped = Math.max(0, Math.floor(used));
  const signature = sign(`${clamped}.${exp}`);
  const value = `${clamped}.${exp}.${signature}`;

  return [
    `${COOKIE_NAME}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${MAX_AGE_SECONDS}`,
    process.env.NODE_ENV === "production" ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

export function guestLimitReached(used: number): boolean {
  return used >= GUEST_FREE_ATTEMPTS;
}
