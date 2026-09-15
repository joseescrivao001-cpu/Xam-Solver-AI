export const runtime = 'edge';

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";

const googleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;

const googleV1 = createGoogleGenerativeAI({
  apiKey: googleKey,
  baseURL: "https://generativelanguage.googleapis.com/v1"
});

const googleBeta = createGoogleGenerativeAI({
  apiKey: googleKey,
  baseURL: "https://generativelanguage.googleapis.com/v1beta"
});

function findOpenRouterKey(): { key: string; sourceName: string } {
  const names = [
    'OPENROUTER_API_KEY',
    'AGENT_ROUTER_API_KEY',
    'AGENTROUTER_API_KEY',
    'OPEN_ROUTER_API_KEY',
    'OPENROUTER_KEY',
    'OPEN_ROUTER_KEY',
    'OPENROUTER_TOKEN',
    'ROUTER_API_KEY',
    'NEXT_PUBLIC_OPENROUTER_API_KEY',
    'NEXT_PUBLIC_AGENT_ROUTER_API_KEY'
  ];

  for (const name of names) {
    const val = process.env[name];
    if (val && typeof val === 'string' && val.trim().length > 0) {
      return { key: val.trim(), sourceName: name };
    }
  }

  for (const [key, val] of Object.entries(process.env)) {
    if (typeof val === 'string' && val.trim().startsWith('sk-or-')) {
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
  const { key: openRouterKey, sourceName: openRouterKeySource } = findOpenRouterKey();

  const openrouter = openRouterKey ? createOpenRouter({
    apiKey: openRouterKey,
    headers: {
      'Authorization': `Bearer ${openRouterKey}`,
      'HTTP-Referer': 'https://xam-solver-ai.vercel.app',
      'X-Title': 'Exam Solver AI'
    }
  }) : null;

  const apiKey = googleKey || "";
  
  const inspection: Record<string, unknown> = {};

  // 1. Inspecionar modelos disponíveis no v1 diretamente da Google
  if (apiKey) {
    try {
      const resV1 = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
      const dataV1 = await resV1.json();
      inspection.v1Response = resV1.status === 200 ? dataV1.models?.map((m: { name: string }) => m.name) : dataV1;
    } catch (e: unknown) {
      inspection.v1Error = e instanceof Error ? e.message : String(e);
    }
  }

  // 2. Testar modelos via SDK
  const results: Record<string, { status: string; response?: string; error?: string }> = {};

  const models = [
    { provider: 'openrouter', id: 'deepseek-v4-flash' },
    { provider: 'openrouter', id: 'gpt-5.6-sol' },
    { provider: 'openrouter', id: 'claude-opus-5' },
    { provider: 'google-v1', id: 'gemini-3.8-flash' },
    { provider: 'google-beta', id: 'gemini-3.1-pro-preview' },
    { provider: 'groq', id: 'llama-3.1-8b-instant' }
  ];

  for (const model of models) {
    try {
      if (model.provider === 'openrouter' && !openrouter) {
        results[model.id] = {
          status: 'error',
          error: 'OPENROUTER_API_KEY não configurada na Vercel (adicione nas Environment Variables)'
        };
        continue;
      }

      const aiModel = model.provider === 'groq' 
        ? groq(model.id) 
        : model.provider === 'openrouter'
        ? openrouter!(resolveOpenRouterId(model.id))
        : model.provider === 'google-beta'
        ? googleBeta(model.id)
        : googleV1(model.id);
      
      const { text } = await generateText({
        model: aiModel,
        prompt: "Responda apenas com a palavra OK."
      });

      results[model.id] = { status: 'success', response: text };
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      results[model.id] = { status: 'error', error: errorMsg };
    }
  }

  const envKeys = {
    google: !!(process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY),
    groq: !!process.env.GROQ_API_KEY,
    openrouter: !!openRouterKey,
    openrouterSource: openRouterKeySource
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

