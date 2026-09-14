export const runtime = 'edge';

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";
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

export async function GET() {
  const apiKey = googleKey || "";
  
  const inspection: Record<string, unknown> = {};

  // 1. Inspecionar modelos disponíveis no v1 e v1beta diretamente da Google
  if (apiKey) {
    try {
      const resV1 = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
      const dataV1 = await resV1.json();
      inspection.v1Response = resV1.status === 200 ? dataV1.models?.map((m: { name: string }) => m.name) : dataV1;
    } catch (e: unknown) {
      inspection.v1Error = e instanceof Error ? e.message : String(e);
    }

    try {
      const resBeta = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      const dataBeta = await resBeta.json();
      inspection.v1BetaResponse = resBeta.status === 200 ? dataBeta.models?.map((m: { name: string }) => m.name) : dataBeta;
    } catch (e: unknown) {
      inspection.v1BetaError = e instanceof Error ? e.message : String(e);
    }
  }

  // 2. Testar modelos via SDK
  const results: Record<string, { status: string; response?: string; error?: string }> = {};

  const models = [
    { provider: 'google-beta', id: 'gemini-3.1-pro-preview' },
    { provider: 'google-v1', id: 'gemini-3.8-flash' },
    { provider: 'groq', id: 'openai/gpt-oss-120b' }
  ];

  for (const model of models) {
    try {
      const aiModel = model.provider === 'groq' 
        ? groq(model.id) 
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
    groq: !!process.env.GROQ_API_KEY
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
