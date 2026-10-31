export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

import { verifyAdmin } from "@/lib/admin-auth";
import { apiError } from "@/lib/http";

/**
 * Diagnóstico de conectividade com o fornecedor de IA.
 *
 * Correção de segurança (2026-10-28): esta rota era PÚBLICA — não exigia
 * sessão — e, além de revelar o prefixo e o sufixo da chave
 * (`keyPreview: "csk_...9f2a"`), disparava seis inferências pagas por pedido,
 * o que permitia a qualquer visitante queimar saldo em ciclo.
 *
 * Passa a exigir administrador e a não expor qualquer fragmento de chave.
 * Desativada em produção salvo `ENABLE_SYSTEM_CHECK=true`.
 */

const LOCKED_MODELS = [
  'deepseek-v4-flash',
  'glm-5.3',
  'gpt-5.6-sol',
  'gpt-6-astra',
  'claude-opus-4-8',
  'claude-opus-5'
];

interface ModelResult {
  status: string;
  response?: string;
  error?: string;
}

export async function GET() {
  const auth = await verifyAdmin();
  if (!auth.isAdmin) {
    return apiError("not_found", { scope: "[SYSTEM_CHECK]" });
  }

  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_SYSTEM_CHECK !== 'true') {
    return apiError("not_found", {
      scope: "[SYSTEM_CHECK]",
      message: "Diagnóstico desativado em produção.",
    });
  }

  const apiKey = process.env.CEREBRAS_API_KEY?.trim() || '';
  const results: Record<string, ModelResult> = {};

  if (!apiKey) {
    return apiError("upstream_unavailable", {
      scope: "[SYSTEM_CHECK]",
      message: "CEREBRAS_API_KEY não configurada.",
    });
  }

  for (const model of LOCKED_MODELS) {
    try {
      const res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'Say OK' }],
          max_tokens: 5
        })
      });

      if (!res.ok) {
        results[model] = { status: 'error', error: `HTTP ${res.status}` };
        continue;
      }

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || 'OK';
      results[model] = { status: 'success', response: String(text).trim().slice(0, 60) };
    } catch {
      results[model] = { status: 'error', error: 'Falha de rede' };
    }
  }

  const successCount = Object.values(results).filter(r => r.status === 'success').length;

  return Response.json({
    timestamp: new Date().toISOString(),
    summary: `${successCount}/${LOCKED_MODELS.length} modelos operacionais`,
    models: results,
  });
}
