export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const LOCKED_MODELS = [
  'deepseek-v4-flash',
  'glm-5.3',
  'gpt-5.6-sol',
  'gpt-6-astra',
  'claude-opus-4-8',
  'claude-opus-5'
];

function getApiKey(): { key: string; name: string } {
  const key = process.env.CEREBRAS_API_KEY;
  if (key && typeof key === 'string' && key.trim()) {
    return { key: key.trim(), name: 'CEREBRAS_API_KEY' };
  }
  return { key: '', name: 'NOT_SET' };
}

function resolveModelId(model: string): string {
  // 1. Modelos nativos Cerebras (Prioridade)
  if (model === 'gpt-oss-120b') return 'gpt-oss-120b';
  if (model === 'qwen-3.8-27b') return 'qwen-3.8-27b';
  if (model === 'llama3.1-8b') return 'llama3.1-8b';

  // 2. Tier Elite / Visão -> qwen-3.8-27b
  if (model.includes('opus') || model.includes('vision') || model === 'claude-opus-4-8' || model === 'claude-opus-5') {
    return 'qwen-3.8-27b';
  }

  // 3. Tier Básico -> llama3.1-8b (CORRIGIDO)
  if (model.includes('flash') || model.includes('basic') || model === 'deepseek-v4-flash') {
    return 'llama3.1-8b';
  }

  // 4. Tier Avançado -> gpt-oss-120b
  if (model.includes('pro') || model.includes('ultra') || model === 'glm-5.3' || model === 'gpt-5.6-sol' || model === 'gpt-6-astra') {
    return 'gpt-oss-120b';
  }

  return 'gpt-oss-120b'; // Fallback final
}

interface ModelResult {
  status: string;
  cerebrasModel: string;
  response?: string;
  error?: string;
  endpoint?: string;
}

export async function GET() {
  const { key: apiKey, name: keySourceName } = getApiKey();

  const keyPreview = apiKey
    ? apiKey.slice(0, 4) + '...' + apiKey.slice(-4)
    : 'EMPTY';

  const results: Record<string, ModelResult> = {};
  const baseURL = 'https://api.cerebras.ai/v1';

  for (const model of LOCKED_MODELS) {
    const cerebrasModel = resolveModelId(model);

    if (!apiKey) {
      results[model] = {
        status: 'error',
        cerebrasModel,
        error: 'CEREBRAS_API_KEY not found in Vercel environment variables.'
      };
      continue;
    }

    const url = `${baseURL}/chat/completions`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'cerebras-cloud-sdk/typescript/1.0.0'
        },
        body: JSON.stringify({
          model: cerebrasModel,
          messages: [{ role: 'user', content: 'Say OK' }],
          max_tokens: 5
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        results[model] = {
          status: 'error',
          cerebrasModel,
          error: `${res.status}: ${errText.slice(0, 200)}`,
          endpoint: baseURL
        };
        continue;
      }

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || data.message || 'OK';

      results[model] = {
        status: 'success',
        cerebrasModel,
        response: text.trim().slice(0, 100),
        endpoint: baseURL
      };
    } catch (err: unknown) {
      results[model] = {
        status: 'error',
        cerebrasModel,
        error: err instanceof Error ? err.message : String(err),
        endpoint: baseURL
      };
    }
  }

  const successCount = Object.values(results).filter(r => r.status === 'success').length;

  return new Response(JSON.stringify({
    timestamp: new Date().toISOString(),
    connectionType: 'NATIVE_CEREBRAS_API',
    summary: `${successCount}/${LOCKED_MODELS.length} models operational`,
    envKeys: {
      detected: !!apiKey,
      variable: keySourceName,
      keyPreview
    },
    models: results
  }, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}
