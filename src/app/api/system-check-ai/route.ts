export const runtime = 'edge';

import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";
import { generateText } from "ai";

export async function GET() {
  const results: Record<string, { status: string; response?: string; error?: string }> = {};

  const models = [
    { provider: 'google', id: 'gemini-1.5-pro-latest' },
    { provider: 'google', id: 'gemini-1.5-flash' },
    { provider: 'groq', id: 'llama-3.3-70b-versatile' }
  ];

  for (const model of models) {
    try {
      const aiModel = model.provider === 'groq' ? groq(model.id) : google(model.id);
      
      const { text } = await generateText({
        model: aiModel,
        prompt: "Responda apenas com a palavra OK.",
        maxTokens: 10
      });

      results[model.id] = { status: 'success', response: text };
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      results[model.id] = { status: 'error', error: errorMsg };
    }
  }

  const envKeys = {
    google: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    groq: !!process.env.GROQ_API_KEY
  };

  return new Response(JSON.stringify({
    timestamp: new Date().toISOString(),
    envKeys,
    models: results,
    // @ts-expect-error globalThis augmentation
    circuitBreakerState: globalThis.circuitState || null
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
