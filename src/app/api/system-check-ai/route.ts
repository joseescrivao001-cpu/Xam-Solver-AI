export const runtime = 'edge';

// 2. LOCK DE MODELOS DEFINITIVO (SÓ ESTES):
const LOCKED_MODELS = [
  'deepseek-v4-flash',
  'glm-5.3',
  'gpt-5.6-sol',
  'gpt-6-astra',
  'claude-opus-4-8',
  'claude-opus-5'
];

function getApiKey(): { key: string; name: string } {
  const envNames = [
    'AGENT_ROUTER_API_KEY',
    'AGENTROUTER_API_KEY',
    'OPENROUTER_API_KEY',
    'OPEN_ROUTER_API_KEY',
    'AGENT_ROUTER_KEY',
    'ROUTER_API_KEY',
    'NEXT_PUBLIC_AGENT_ROUTER_API_KEY',
    'NEXT_PUBLIC_OPENROUTER_API_KEY'
  ];
  for (const name of envNames) {
    const v = process.env[name];
    if (v && v.trim()) return { key: v.trim(), name };
  }
  for (const [k, v] of Object.entries(process.env)) {
    if (typeof v === 'string' && (v.trim().startsWith('sk-') || v.trim().startsWith('ar-'))) {
      return { key: v.trim(), name: k };
    }
  }
  return { key: '', name: 'NOT_SET' };
}

function resolveModelId(model: string, baseURL: string): string {
  if (baseURL.includes('openrouter.ai')) {
    if (model === 'deepseek-v4-flash') return 'deepseek/deepseek-v4-flash';
    if (model === 'glm-5.3') return 'z-ai/glm-5.3-flash';
    if (model === 'gpt-5.6-sol') return 'openai/gpt-5.6-sol';
    if (model === 'gpt-6-astra') return 'openai/gpt-6-astra';
    if (model === 'claude-opus-4-8') return 'anthropic/claude-opus-4.8';
    if (model === 'claude-opus-5') return 'anthropic/claude-opus-5';
  }
  return model;
}

export async function GET() {
  const { key: apiKey, name: keySourceName } = getApiKey();

  const results: Record<string, { status: string; response?: string; error?: string; endpoint?: string }> = {};

  // Chamadas REST via fetch nativo (Arquitetura de Conexão Forçada)
  const candidateBaseURLs = [
    'https://agentrouter.org/v1',
    'https://co.agentrouter.org/v1',
    'https://openrouter.ai/api/v1'
  ];

  for (const model of LOCKED_MODELS) {
    if (!apiKey) {
      results[model] = {
        status: 'error',
        error: 'Chave não encontrada no ambiente Vercel. Adicione AGENT_ROUTER_API_KEY.'
      };
      continue;
    }

    let succeeded = false;
    let lastError = '';
    let usedEndpoint = '';

    for (const baseURL of candidateBaseURLs) {
      const url = `${baseURL}/chat/completions`;
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + apiKey,
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'User-Agent': 'claude-cli/1.0.108',
            'HTTP-Referer': 'https://xam-solver-ai.vercel.app',
            'X-Title': 'Exam Solver AI'
          },
          body: JSON.stringify({
            model: resolveModelId(model, baseURL),
            messages: [{ role: 'user', content: 'Responda apenas com a palavra OK.' }],
            max_tokens: 10
          })
        });

        if (!res.ok) {
          const errText = await res.text();
          lastError = `Status ${res.status}: ${errText.slice(0, 180)}`;
          continue;
        }

        const data = await res.json();
        const text = data.choices?.[0]?.message?.content || data.message || 'OK';

        results[model] = { status: 'success', response: text.trim(), endpoint: baseURL };
        succeeded = true;
        usedEndpoint = baseURL;
        break;
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : String(err);
      }
    }

    if (!succeeded) {
      results[model] = { status: 'error', error: lastError, endpoint: usedEndpoint || candidateBaseURLs[0] };
    }
  }

  return new Response(JSON.stringify({
    timestamp: new Date().toISOString(),
    connectionType: 'REST_NATIVE_FETCH',
    envKeys: {
      AGENT_ROUTER_API_KEY: !!apiKey,
      detectedVariable: keySourceName
    },
    models: results
  }, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}

