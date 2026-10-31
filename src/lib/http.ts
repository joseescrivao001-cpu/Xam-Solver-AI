import { NextResponse } from "next/server";

/**
 * Respostas de API padronizadas.
 *
 * Regra: o cliente recebe uma mensagem PT-PT estável e acionável; o detalhe
 * técnico (erros do Postgres, do gateway de IA, chaves, caminhos internos)
 * fica apenas nos logs do servidor. Antes desta camada, os `catch` devolviam
 * `error.message` cru ao browser.
 */

export type ApiErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "invalid_input"
  | "insufficient_credits"
  | "upgrade_required"
  | "rate_limited"
  | "payload_too_large"
  | "upstream_unavailable"
  | "internal";

const STATUS: Record<ApiErrorCode, number> = {
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  invalid_input: 400,
  insufficient_credits: 402,
  upgrade_required: 403,
  rate_limited: 429,
  payload_too_large: 413,
  upstream_unavailable: 503,
  internal: 500,
};

const DEFAULT_MESSAGE: Record<ApiErrorCode, string> = {
  unauthorized: "Precisa de iniciar sessão para continuar.",
  forbidden: "Não tem permissão para esta ação.",
  not_found: "Recurso não encontrado.",
  invalid_input: "Os dados enviados são inválidos.",
  insufficient_credits: "Créditos insuficientes. Faça upgrade para continuar.",
  upgrade_required: "Esta funcionalidade exige um plano superior.",
  rate_limited: "Demasiados pedidos. Aguarde alguns instantes.",
  payload_too_large: "O ficheiro é demasiado grande.",
  upstream_unavailable: "O serviço de IA está indisponível. Tente novamente.",
  internal: "Ocorreu um erro inesperado.",
};

interface ApiErrorOptions {
  message?: string;
  /** Detalhe técnico — registado no servidor, nunca enviado ao cliente. */
  cause?: unknown;
  /** Contexto para o log, ex.: "[CHAT]". */
  scope?: string;
  headers?: Record<string, string>;
  /** Campos extra seguros para o cliente (ex.: code: "UPGRADE_REQUIRED"). */
  extra?: Record<string, unknown>;
}

export function apiError(code: ApiErrorCode, options: ApiErrorOptions = {}) {
  const { message, cause, scope, headers, extra } = options;

  if (cause !== undefined) {
    console.error(`${scope ?? "[API]"} ${code}:`, cause);
  }

  return NextResponse.json(
    { error: message ?? DEFAULT_MESSAGE[code], code, ...extra },
    { status: STATUS[code], headers }
  );
}

/** Mesmo contrato, mas para rotas que devolvem texto/stream. */
export function textError(code: ApiErrorCode, options: ApiErrorOptions = {}) {
  const { message, cause, scope, headers } = options;

  if (cause !== undefined) {
    console.error(`${scope ?? "[API]"} ${code}:`, cause);
  }

  return new Response(message ?? DEFAULT_MESSAGE[code], {
    status: STATUS[code],
    headers: { "Content-Type": "text/plain; charset=utf-8", ...headers },
  });
}

/** Log seguro de um erro desconhecido, sem o propagar ao cliente. */
export function logError(scope: string, error: unknown) {
  const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  console.error(`${scope} ${detail}`);
}
