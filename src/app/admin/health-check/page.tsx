import { GoogleGenerativeAI } from "@google/generative-ai";
import { CheckCircle, XCircle } from "lucide-react";

export const dynamic = "force-dynamic"; // Garante que a página não seja cacheada e leia as variáveis em tempo real

export default async function HealthCheckPage() {
  const envVars = [
    { name: "NEXT_PUBLIC_SUPABASE_URL", value: process.env.NEXT_PUBLIC_SUPABASE_URL },
    { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
    { name: "SUPABASE_SERVICE_ROLE_KEY", value: process.env.SUPABASE_SERVICE_ROLE_KEY },
    { name: "GOOGLE_GEMINI_API_KEY", value: process.env.GOOGLE_GEMINI_API_KEY },
  ];

  const modelEnv = process.env.GEMINI_MODEL;
  const isModelOk = modelEnv === "gemini-1.5-flash" || modelEnv === "gemini-1.5-pro-latest";

  let geminiTestStatus = "Não testado";
  let geminiTestError = null;

  if (process.env.GOOGLE_GEMINI_API_KEY) {
    try {
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
      const modelToUse = modelEnv || "gemini-1.5-pro-latest";
      const model = genAI.getGenerativeModel({ model: modelToUse });
      
      const result = await model.generateContent("Responda exatamente com a palavra: OK");
      geminiTestStatus = result.response.text();
    } catch (error: unknown) {
      geminiTestStatus = "Falhou";
      geminiTestError = error instanceof Error ? error.message : "Erro desconhecido";
    }
  } else {
    geminiTestStatus = "Pulado (Falta a chave da API)";
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8 text-slate-900 font-sans">
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Diagnóstico do Sistema</h1>
          <p className="text-slate-500 mt-2">Visão geral das chaves de API e integrações.</p>
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
            
            {/* GEMINI_MODEL Especial */}
            <li className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border">
              <span className="font-mono text-sm font-medium">GEMINI_MODEL</span>
              {isModelOk ? (
                <span className="flex items-center text-green-600 font-bold text-sm bg-green-100 px-3 py-1 rounded-full">
                  <CheckCircle className="w-4 h-4 mr-1" /> OK ({modelEnv})
                </span>
              ) : (
                <span className="flex items-center text-red-600 font-bold text-sm bg-red-100 px-3 py-1 rounded-full">
                  <XCircle className="w-4 h-4 mr-1" /> ERRADO ({modelEnv || "Vazio"})
                </span>
              )}
            </li>
          </ul>
        </div>

        {/* Bloco 2: Teste da API do Gemini */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">2. Teste de Resposta (Gemini API)</h2>
          
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
