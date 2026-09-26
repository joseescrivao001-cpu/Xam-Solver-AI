export const runtime = 'edge';

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
    const map: Record<string, string> = {
      'deepseek-v4-flash': 'deepseek/deepseek-v4-flash',
      'glm-5.3': 'zhipu-ai/glm-4-flash',
      'gpt-5.6-sol': 'openai/gpt-4o',
      'gpt-6-astra': 'openai/gpt-4o-mini',
      'claude-opus-4-8': 'anthropic/claude-sonnet-4',
      'claude-opus-5': 'anthropic/claude-sonnet-4'
    };
    return map[model] || model;
  }
  return model;
}

interface ModelResult {
  status: string;
  response?: string;
  error?: string;
  endpoint?: string;
  gatewayErrors?: Record<string, string>;
}

export async function GET() {
  const { key: apiKey, name: keySourceName } = getApiKey();

  const keyPreview = apiKey
    ? apiKey.slice(0, 8) + '...' + apiKey.slice(-4)
    : 'EMPTY';

  const results: Record<string, ModelResult> = {};

  const candidateBaseURLs = [
    'https://openrouter.ai/api/v1',
    'https://co.agentrouter.org/v1',
    'https://agentrouter.org/v1'
  ];

  for (const model of LOCKED_MODELS) {
    if (!apiKey) {
      results[model] = {
        status: 'error',
        error: 'API key not found. Add AGENT_ROUTER_API_KEY or OPENROUTER_API_KEY to Vercel env vars.'
      };
      continue;
    }

    let succeeded = false;
    const gatewayErrors: Record<string, string> = {};

    for (const baseURL of candidateBaseURLs) {
      const url = `${baseURL}/chat/completions`;
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'User-Agent': 'claude-cli/1.0.108',
            'HTTP-Referer': 'https://xam-solver-ai.vercel.app',
            'X-Title': 'Exam Solver AI'
          },
          body: JSON.stringify({
            model: resolveModelId(model, baseURL),
            messages: [{ role: 'user', content: 'Say OK' }],
            max_tokens: 5
          })
        });

        if (!res.ok) {
          const errText = await res.text();
          gatewayErrors[baseURL] = `${res.status}: ${errText.slice(0, 200)}`;
          continue;
        }

        const data = await res.json();
        const text = data.choices?.[0]?.message?.content || data.message || 'OK';

        results[model] = {
          status: 'success',
          response: text.trim().slice(0, 100),
          endpoint: baseURL
        };
        succeeded = true;
        break;
      } catch (err: unknown) {
        gatewayErrors[baseURL] = err instanceof Error ? err.message : String(err);
      }
    }

    if (!succeeded) {
      results[model] = {
        status: 'error',
        error: Object.values(gatewayErrors)[0] || 'All gateways failed',
        endpoint: Object.keys(gatewayErrors).pop() || candidateBaseURLs[0],
        gatewayErrors
      };
    }
  }

  const successCount = Object.values(results).filter(r => r.status === 'success').length;

  return new Response(JSON.stringify({
    timestamp: new Date().toISOString(),
    connectionType: 'REST_NATIVE_FETCH',
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
