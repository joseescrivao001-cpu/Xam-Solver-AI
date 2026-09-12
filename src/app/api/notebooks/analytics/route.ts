export const runtime = 'edge';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);

export async function GET(req: Request) {
  try {
    const supabase = createClient();
    const serviceClient = createServiceClient();
    const db = serviceClient || supabase;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autenticado." }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { searchParams } = new URL(req.url);
    const notebook_id = searchParams.get("notebook_id");

    if (!notebook_id) {
      return new Response(JSON.stringify({ error: "notebook_id é obrigatório." }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { data: analytics, error } = await db
      .from("notebook_analytics")
      .select("*")
      .eq("notebook_id", notebook_id)
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Erro ao buscar analytics:", error);
    }

    return new Response(JSON.stringify({ analytics }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro interno.";
    console.error("GET Analytics Exception:", err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const serviceClient = createServiceClient();
    const db = serviceClient || supabase;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autenticado." }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { notebook_id } = await req.json();
    if (!notebook_id) {
      return new Response(JSON.stringify({ error: "notebook_id é obrigatório." }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 1. Obter informações do Caderno
    const { data: notebook } = await db
      .from("notebooks")
      .select("name, description")
      .eq("id", notebook_id)
      .single();

    const notebookName = notebook?.name || "Ambiente de Estudo";

    // 2. Coletar conversas vinculadas ao caderno
    const { data: convs } = await db
      .from("conversations")
      .select("id, title")
      .eq("notebook_id", notebook_id)
      .order("created_at", { ascending: false })
      .limit(15);

    const convIds = (convs || []).map(c => c.id);

    // 3. Coletar mensagens
    let messagesHistory = "";
    if (convIds.length > 0) {
      const { data: msgs } = await db
        .from("messages")
        .select("role, content")
        .in("conversation_id", convIds)
        .order("created_at", { ascending: false })
        .limit(35);

      if (msgs && msgs.length > 0) {
        messagesHistory = msgs
          .reverse()
          .map(m => `${m.role === 'user' ? 'Aluno' : 'IA'}: ${m.content.slice(0, 300)}`)
          .join("\n---\n");
      }
    }

    // 4. Coletar notas
    const { data: notes } = await db
      .from("notebook_notes")
      .select("title, content")
      .eq("notebook_id", notebook_id)
      .limit(10);

    const notesSummary = (notes || []).map(n => `[Nota: ${n.title}]\n${n.content.slice(0, 300)}`).join("\n\n");

    // 5. Coletar materiais
    const { data: materials } = await db
      .from("notebook_materials")
      .select("name, file_type, description")
      .eq("notebook_id", notebook_id)
      .limit(10);

    const materialsSummary = (materials || []).map(m => `- ${m.name} (${m.file_type || 'material'})`).join("\n");

    // Se não tiver dados suficientes ainda
    if (!messagesHistory && !notesSummary && !materialsSummary) {
      const emptyAnalytics = {
        notebook_id,
        user_id: user.id,
        overall_score: 50,
        mastered_topics: [
          { topic: "Início do Caderno", reason: "Caderno recém-criado. Comece fazendo perguntas ou adicionando materiais." }
        ],
        review_topics: [],
        critical_topics: [],
        summary: `O caderno "${notebookName}" ainda não possui dados suficientes para uma análise aprofundada. Interaja com o assistente ou adicione materiais para gerar um diagnóstico completo.`,
        recommendations: "Envie sua primeira dúvida ou adicione materiais/provas para a IA analisar seu nível de proficiência."
      };

      await db.from("notebook_analytics").upsert(emptyAnalytics, { onConflict: "notebook_id" });

      return new Response(JSON.stringify({ analytics: emptyAnalytics }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 6. Chamar IA Gemini para gerar diagnóstico estruturado
    const model = genAI.getGenerativeModel({
      model: "gemini-3.6-flash",
    }, { apiVersion: "v1" });

    const prompt = `Você é o Auditor Pedagógico de IA do ExamSolver AI.
Sua missão é analisar todo o histórico de interações, notas e materiais do Caderno "${notebookName}" e produzir um DIAGNÓSTICO DE DOMÍNIO COGNITIVO estruturado.

CONTEXTO DO CADERNO:
${materialsSummary ? `Materiais anexados:\n${materialsSummary}\n` : ''}
${notesSummary ? `Notas do Aluno:\n${notesSummary}\n` : ''}
${messagesHistory ? `Histórico de Conversas:\n${messagesHistory}\n` : ''}

CRITÉRIOS DE AVALIAÇÃO:
🟢 Verde (mastered_topics): Tópicos e conceitos que o aluno demonstrou bom entendimento, acertou ou avançou sem travar.
🟡 Amarelo (review_topics): Conceitos em dúvida, hesitações ou tópicos que necessitam de consolidação e revisão.
🔴 Vermelho (critical_topics): Dificuldades críticas, erros recorrentes, fórmulas ou passos esquecidos, confusões conceituais.
Para cada tópico vermelho, você DEVE fornecer um 'action_plan' prático de como o aluno deve estudar para passar de Vermelho para Verde.

Responda ESTRITAMENTE em formato JSON VÁLIDO (sem markdown de bloco code \`\`\`json, apenas o JSON puro):
{
  "overall_score": 75,
  "mastered_topics": [
    {"topic": "Nome do tópico", "reason": "Por que está dominado"}
  ],
  "review_topics": [
    {"topic": "Nome do tópico", "reason": "O que precisa revisar"}
  ],
  "critical_topics": [
    {"topic": "Nome do tópico", "reason": "Qual a dificuldade exata", "action_plan": "Como passar para verde"}
  ],
  "summary": "Resumo pedagógico geral do estado do aluno neste caderno.",
  "recommendations": "Plano de ação prioritário para os próximos estudos."
}`;

    const result = await model.generateContent(prompt);
    const textOutput = result.response.text();

    // Limpar delimitadores se houver
    let cleanJson = textOutput.trim();
    if (cleanJson.startsWith("```json")) {
      cleanJson = cleanJson.replace(/^```json\s*/, "").replace(/```\s*$/, "").trim();
    } else if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.replace(/^```\s*/, "").replace(/```\s*$/, "").trim();
    }

    let parsed;
    try {
      parsed = JSON.parse(cleanJson);
    } catch {
      console.error("Falha ao parsear JSON de analytics:", cleanJson);
      parsed = {
        overall_score: 65,
        mastered_topics: [{ topic: "Tópicos Fundamentais", reason: "Demonstrado interesse e perguntas consistentes." }],
        review_topics: [{ topic: "Revisão Geral", reason: "Recomenda-se aprofundar os exercícios do caderno." }],
        critical_topics: [{ topic: "Fixação de Fórmulas", reason: "Prática necessária", action_plan: "Resolver 5 exercícios guiados." }],
        summary: "Diagnóstico inicial gerado com base nas interações registradas.",
        recommendations: "Continue praticando e enviando dúvidas detalhadas para refinar o diagnóstico."
      };
    }

    const payloadToSave = {
      notebook_id,
      user_id: user.id,
      overall_score: Math.min(100, Math.max(0, parseInt(parsed.overall_score || "70", 10))),
      mastered_topics: parsed.mastered_topics || [],
      review_topics: parsed.review_topics || [],
      critical_topics: parsed.critical_topics || [],
      summary: parsed.summary || "",
      recommendations: parsed.recommendations || "",
      updated_at: new Date().toISOString()
    };

    // Upsert em notebook_analytics
    const { data: savedData, error: saveErr } = await db
      .from("notebook_analytics")
      .upsert(payloadToSave, { onConflict: "notebook_id" })
      .select()
      .single();

    if (saveErr) {
      console.warn("Erro ao salvar notebook_analytics (tentando insert direto):", saveErr);
      await db.from("notebook_analytics").insert(payloadToSave);
    }

    return new Response(JSON.stringify({ analytics: savedData || payloadToSave }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro interno no cálculo analítico.";
    console.error("POST Analytics Exception:", err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
