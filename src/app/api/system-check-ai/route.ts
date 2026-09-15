export const runtime = 'edge';

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
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

function getAgentRouterModel(modelId: string, apiKey: string) {
  // Regra oficial do Agent Router:
  // Claude Opus -> https://agentrouter.org (SEM /v1)
  // DeepSeek e outros -> https://agentrouter.org/v1 (COM /v1)
  const isClaudeOpus = modelId.toLowerCase().includes('claude') || modelId.toLowerCase().includes('opus');
  const baseURL = isClaudeOpus ? 'https://agentrouter.org' : 'https://agentrouter.org/v1';

  const provider = createOpenAI({
    apiKey: apiKey,
    baseURL: baseURL,
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  });

  return provider(modelId);
}

export async function GET() {
  const { key: agentRouterKey, sourceName: agentRouterKeySource } = findAgentRouterKey();

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
    { provider: 'agentrouter', id: 'deepseek-v4-flash' },
    { provider: 'agentrouter', id: 'gpt-5.6-sol' },
    { provider: 'agentrouter', id: 'claude-opus-5' },
    { provider: 'google-v1', id: 'gemini-3.8-flash' },
    { provider: 'google-beta', id: 'gemini-3.1-pro-preview' },
    { provider: 'groq', id: 'llama-3.1-8b-instant' }
  ];

  for (const model of models) {
    try {
      if (model.provider === 'agentrouter' && !agentRouterKey) {
        results[model.id] = {
          status: 'error',
          error: 'Chave do Agent Router não configurada na Vercel (adicione AGENT_ROUTER_API_KEY)'
        };
        continue;
      }

      const aiModel = model.provider === 'groq' 
        ? groq(model.id) 
        : model.provider === 'agentrouter'
        ? getAgentRouterModel(model.id, agentRouterKey)
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

