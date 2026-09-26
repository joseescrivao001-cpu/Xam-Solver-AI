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
  const key = process.env['CEREBRAS_API_KEY'];
  if (key && typeof key === 'string' && key.trim()) {
    return { key: key.trim(), name: 'CEREBRAS_API_KEY' };
  }
  return { key: '', name: 'NOT_SET' };
}

function resolveModelId(model: string): string {
  const map: Record<string, string> = {
    'deepseek-v4-flash': 'llama3.1-8b',
    'glm-5.3': 'llama3.1-70b',
    'gpt-5.6-sol': 'llama3.1-70b',
    'gpt-6-astra': 'llama3.1-8b',
    'claude-opus-4-8': 'llama3.1-70b',
    'claude-opus-5': 'llama3.1-70b'
  };
  return map[model] || 'llama3.1-70b';
}

interface ModelResult {
  status: string;
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
    if (!apiKey) {
      results[model] = {
        status: 'error',
        error: 'CEREBRAS_API_KEY not found in Vercel environment variables.'
      };
      continue;
    }

    const cerebrasModel = resolveModelId(model);
    const url = `${baseURL}/chat/completions`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
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
          error: `${res.status}: ${errText.slice(0, 200)}`,
          endpoint: baseURL
        };
        continue;
      }

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || data.message || 'OK';

      results[model] = {
        status: 'success',
        response: text.trim().slice(0, 100),
        endpoint: baseURL
      };
    } catch (err: unknown) {
      results[model] = {
        status: 'error',
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
