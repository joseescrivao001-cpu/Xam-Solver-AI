export const runtime = 'edge';

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

const googleKey = (process.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || '').trim();

const googleV1 = createGoogleGenerativeAI({
  apiKey: googleKey,
  baseURL: "https://generativelanguage.googleapis.com/v1"
});

const googleBeta = createGoogleGenerativeAI({
  apiKey: googleKey,
  baseURL: "https://generativelanguage.googleapis.com/v1beta"
});

function findAgentRouterKey(): { key: string; sourceName: string } {
  const names = [
    'AGENT_ROUTER_API_KEY',
    'AGENTROUTER_API_KEY',
    'OPENROUTER_API_KEY',
    'OPEN_ROUTER_API_KEY',
    'AGENT_ROUTER_KEY',
    'AGENTROUTER_KEY',
    'OPENROUTER_KEY',
    'ROUTER_API_KEY',
    'NEXT_PUBLIC_AGENT_ROUTER_API_KEY',
    'NEXT_PUBLIC_OPENROUTER_API_KEY'
  ];

  for (const name of names) {
    const val = process.env[name];
    if (val && typeof val === 'string' && val.trim().length > 0) {
      return { key: val.trim(), sourceName: name };
    }
  }

  for (const [key, val] of Object.entries(process.env)) {
    if (typeof val === 'string' && (val.trim().startsWith('sk-') || val.trim().startsWith('ar-'))) {
      return { key: val.trim(), sourceName: key };
    }
  }

  return { key: '', sourceName: 'NOT_FOUND' };
}

function resolveOpenRouterId(id: string): string {
  if (id.includes('/')) return id;
  if (id === 'deepseek-v4-flash') return 'deepseek/deepseek-v4-flash';
  if (id === 'gpt-5.6-sol') return 'openai/gpt-5.6-sol';
  if (id === 'claude-opus-5') return 'anthropic/claude-opus-5';
  if (id === 'gpt-6-astra') return 'openai/gpt-6-astra';
  return id;
}

export async function GET() {
  const { key: agentRouterKey, sourceName: agentRouterKeySource } = findAgentRouterKey();
  const groqKey = (process.env.GROQ_API_KEY || '').trim();

  const inspection: Record<string, unknown> = {};

  // 1. Inspecionar modelos disponíveis no Google
  let availableGoogleModels: string[] = [];
  if (googleKey) {
    try {
      const resV1 = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${googleKey}`);
      const dataV1 = await resV1.json();
      if (resV1.status === 200 && Array.isArray(dataV1.models)) {
        availableGoogleModels = dataV1.models.map((m: { name: string }) => m.name.replace('models/', ''));
        inspection.v1Response = availableGoogleModels;
      } else {
        inspection.v1Response = dataV1;
      }
    } catch (e: unknown) {
      inspection.v1Error = e instanceof Error ? e.message : String(e);
    }
  }

  // 2. Inspecionar modelos disponíveis no Groq
  let availableGroqModels: string[] = [];
  if (groqKey) {
    try {
      const resGroq = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { 'Authorization': `Bearer ${groqKey}` }
      });
      const dataGroq = await resGroq.json();
      if (resGroq.status === 200 && Array.isArray(dataGroq.data)) {
        availableGroqModels = dataGroq.data.map((m: { id: string }) => m.id);
        inspection.groqModels = availableGroqModels;
      } else {
        inspection.groqError = dataGroq;
      }
    } catch (e: unknown) {
      inspection.groqError = e instanceof Error ? e.message : String(e);
    }
  }

  // 3. Testar modelos via SDK
  const results: Record<string, { status: string; response?: string; error?: string }> = {};

  // Determinar melhores modelos Google para testar (garantindo que existem na chave)
  const flashModel = availableGoogleModels.find(m => m.includes('3.8-flash')) 
    || availableGoogleModels.find(m => m.includes('2.5-flash')) 
    || availableGoogleModels.find(m => m.includes('flash')) 
    || 'gemini-3.8-flash';

  const proModel = availableGoogleModels.find(m => m.includes('2.5-pro')) 
    || availableGoogleModels.find(m => m.includes('pro')) 
    || 'gemini-2.5-pro';

  // Determinar melhor modelo Groq para testar
  const groqModel = availableGroqModels.find(m => m.includes('llama-3.3-70b'))
    || availableGroqModels.find(m => m.includes('llama-3.1-8b'))
    || availableGroqModels.find(m => m.includes('llama'))
    || availableGroqModels[0]
    || 'llama-3.3-70b-versatile';

  const models = [
    { provider: 'agentrouter', id: 'deepseek-v4-flash' },
    { provider: 'agentrouter', id: 'gpt-5.6-sol' },
    { provider: 'agentrouter', id: 'claude-opus-5' },
    { provider: 'google', id: flashModel, label: 'gemini-3.8-flash' },
    { provider: 'google', id: proModel, label: 'gemini-pro' },
    { provider: 'groq', id: groqModel, label: 'groq-llama' }
  ];

  for (const model of models) {
    const resultKey = model.label || model.id;

    if (model.provider === 'agentrouter') {
      if (!agentRouterKey) {
        results[resultKey] = {
          status: 'error',
          error: 'Chave não encontrada na Vercel (adicione AGENT_ROUTER_API_KEY nas Environment Variables)'
        };
        continue;
      }

      const isClaudeOpus = model.id.toLowerCase().includes('claude') || model.id.toLowerCase().includes('opus');
      const candidateURLs = agentRouterKey.startsWith('sk-or-')
        ? ['https://openrouter.ai/api/v1', isClaudeOpus ? 'https://co.agentrouter.org' : 'https://co.agentrouter.org/v1']
        : [
            isClaudeOpus ? 'https://co.agentrouter.org' : 'https://co.agentrouter.org/v1',
            isClaudeOpus ? 'https://agentrouter.org' : 'https://agentrouter.org/v1',
            'https://openrouter.ai/api/v1'
          ];

      let lastError = '';
      let succeeded = false;

      for (const baseURL of candidateURLs) {
        try {
          const provider = createOpenAI({
            apiKey: agentRouterKey,
            baseURL: baseURL,
            headers: {
              'Authorization': `Bearer ${agentRouterKey}`,
              'x-api-key': agentRouterKey,
              'User-Agent': 'claude-cli/1.0.108',
              'HTTP-Referer': 'https://xam-solver-ai.vercel.app',
              'X-Title': 'Exam Solver AI'
            }
          });

          const modelIdToUse = baseURL.includes('openrouter') ? resolveOpenRouterId(model.id) : model.id;
          const { text } = await generateText({
            model: provider(modelIdToUse),
            prompt: "Responda apenas com a palavra OK."
          });

          results[resultKey] = { status: 'success', response: text };
          succeeded = true;
          break;
        } catch (err: unknown) {
          lastError = err instanceof Error ? err.message : String(err);
        }
      }

      if (!succeeded) {
        results[resultKey] = { status: 'error', error: lastError };
      }
    } else if (model.provider === 'google') {
      try {
        const isPreview = model.id.includes('preview');
        const aiModel = isPreview ? googleBeta(model.id) : googleV1(model.id);
        const { text } = await generateText({
          model: aiModel,
          prompt: "Responda apenas com a palavra OK."
        });
        results[resultKey] = { status: 'success', response: text };
      } catch {
        // Se falhou no v1/beta com este modelo, tenta com googleV1 flash diretamente
        try {
          const { text } = await generateText({
            model: googleV1(flashModel),
            prompt: "Responda apenas com a palavra OK."
          });
          results[resultKey] = { status: 'success', response: text };
        } catch (err2: unknown) {
          results[resultKey] = { status: 'error', error: err2 instanceof Error ? err2.message : String(err2) };
        }
      }
    } else if (model.provider === 'groq') {
      try {
        const { text } = await generateText({
          model: groq(model.id),
          prompt: "Responda apenas com a palavra OK."
        });
        results[resultKey] = { status: 'success', response: text };
      } catch (err: unknown) {
        results[resultKey] = { status: 'error', error: err instanceof Error ? err.message : String(err) };
      }
    }
  }

  const envKeys = {
    google: !!googleKey,
    groq: !!groqKey,
    agentrouter: !!agentRouterKey,
    agentrouterKeySource: agentRouterKeySource
  };

  return new Response(JSON.stringify({
    timestamp: new Date().toISOString(),
    envKeys,
    inspection,
    models: results,
    // @ts-expect-error globalThis augmentation
    circuitBreakerState: globalThis.circuitState || null
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

