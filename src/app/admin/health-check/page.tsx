import { GoogleGenerativeAI } from "@google/generative-ai";
import { CheckCircle, XCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HealthCheckPage() {
  const envVars = [
    { name: "NEXT_PUBLIC_SUPABASE_URL", value: process.env.NEXT_PUBLIC_SUPABASE_URL },
    { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
    { name: "SUPABASE_SERVICE_ROLE_KEY", value: process.env.SUPABASE_SERVICE_ROLE_KEY },
    { name: "GOOGLE_GEMINI_API_KEY", value: process.env.GOOGLE_GEMINI_API_KEY },
  ];

  const rawModel = process.env.GEMINI_MODEL;
  const modelEnv = rawModel ? rawModel.trim() : "";
  const isModelOk = modelEnv === "gemini-1.5-flash" || modelEnv === "gemini-1.5-pro-latest" || modelEnv === "gemini-pro";

  let geminiTestStatus = "Não testado";
  let geminiTestError = null;
  let availableModels: { name: string; supportedGenerationMethods: string[] }[] = [];
  let modelFetchError = null;

  if (process.env.GOOGLE_GEMINI_API_KEY) {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY.trim();
    
    // 1. Listar Modelos disponíveis para esta chave via REST API
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      if (!res.ok) {
        modelFetchError = `Erro na API HTTP: ${res.status} - ${res.statusText}`;
      } else {
        const data = await res.json();
        availableModels = data.models || [];
      }
    } catch (err: unknown) {
      modelFetchError = err instanceof Error ? err.message : "Erro desconhecido";
    }

    // 2. Testar chamada GenerateContent com o modelo selecionado (ou fallback pro primeiro disponível)
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      
      // Auto-fallback: se o modelo do env não existir na lista, pega o primeiro que suporte generateContent
      let modelToUse = modelEnv || "gemini-1.5-pro-latest";
      
      if (availableModels.length > 0) {
        const modelNames = availableModels.map(m => m.name.replace('models/', ''));
        if (!modelNames.includes(modelToUse)) {
          // Achar o primeiro modelo suportado útil (gemini-1.5-flash, gemini-1.5-pro, gemini-pro)
          const fallback = availableModels.find(m => m.supportedGenerationMethods.includes("generateContent") && m.name.includes("gemini"));
          if (fallback) {
            modelToUse = fallback.name.replace('models/', '');
          }
        }
      }

      const model = genAI.getGenerativeModel({ model: modelToUse });
      
      const result = await model.generateContent("Responda exatamente com a palavra: OK");
      geminiTestStatus = `Sucesso usando o modelo: ${modelToUse}. Resposta: ${result.response.text()}`;
    } catch (error: unknown) {
      geminiTestStatus = "Falhou";
      geminiTestError = error instanceof Error ? error.message : "Erro desconhecido";
    }
  } else {
    geminiTestStatus = "Pulado (Falta a chave da API)";
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8 text-slate-900 font-sans">
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Diagnóstico do Sistema</h1>
          <p className="text-slate-500 mt-2">Visão geral das chaves de API, integrações e Modelos Habilitados.</p>
        </div>

        {/* Bloco 1: Variáveis de Ambiente */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">1. Checklist de Conexão (Variáveis)</h2>
          <ul className="space-y-3">
            {envVars.map((env) => (
              <li key={env.name} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border">
                <span className="font-mono text-sm font-medium">{env.name}</span>
                {env.value ? (
                  <span className="flex items-center text-green-600 font-bold text-sm bg-green-100 px-3 py-1 rounded-full">
                    <CheckCircle className="w-4 h-4 mr-1" /> OK
                  </span>
                ) : (
                  <span className="flex items-center text-red-600 font-bold text-sm bg-red-100 px-3 py-1 rounded-full">
                    <XCircle className="w-4 h-4 mr-1" /> FALTANDO
                  </span>
                )}
              </li>
            ))}
            
            <li className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border">
              <span className="font-mono text-sm font-medium">GEMINI_MODEL</span>
              {isModelOk ? (
                <span className="flex items-center text-green-600 font-bold text-sm bg-green-100 px-3 py-1 rounded-full">
                  <CheckCircle className="w-4 h-4 mr-1" /> OK ({modelEnv})
                </span>
              ) : (
                <span className="flex items-center text-red-600 font-bold text-sm bg-red-100 px-3 py-1 rounded-full">
                  <XCircle className="w-4 h-4 mr-1" /> AVISO ({modelEnv || "Vazio"})
                </span>
              )}
            </li>
          </ul>
        </div>

        {/* Bloco 2: Modelos Permitidos pela API Key */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">2. Modelos Habilitados para sua Chave</h2>
          {modelFetchError ? (
            <div className="bg-red-50 text-red-800 p-4 rounded-lg font-mono text-sm">{modelFetchError}</div>
          ) : (
            <div className="max-h-60 overflow-y-auto border rounded-lg bg-slate-50 p-4">
              {availableModels.length > 0 ? (
                <ul className="space-y-2">
                  {availableModels.map((m) => (
                    <li key={m.name} className="flex justify-between border-b border-slate-200 pb-2">
                      <strong className="font-mono text-sm text-blue-700">{m.name.replace('models/', '')}</strong>
                      <span className="text-xs text-slate-500">
                        {m.supportedGenerationMethods?.includes("generateContent") ? "✅ generateContent" : "❌ s/ suporte"}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">Nenhum modelo encontrado.</p>
              )}
            </div>
          )}
        </div>

        {/* Bloco 3: Teste da API do Gemini */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">3. Teste de Resposta (Gemini API)</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border bg-slate-50">
              <span className="font-medium">Status da Chamada:</span>
              <span className={`font-bold ${geminiTestError ? 'text-red-600' : 'text-green-600'}`}>
                {geminiTestError ? "ERRO" : "SUCESSO"}
              </span>
            </div>

            {geminiTestError ? (
              <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 font-mono text-sm overflow-auto">
                <strong>Erro exato retornado pela API:</strong>
                <pre className="mt-2 whitespace-pre-wrap">{geminiTestError}</pre>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4 font-mono text-sm">
                <strong>Resposta da IA:</strong>
                <p className="mt-2">{geminiTestStatus}</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
