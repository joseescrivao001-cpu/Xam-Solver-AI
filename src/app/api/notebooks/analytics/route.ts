import { resolveModelId } from "@/lib/models";
export const runtime = 'edge';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

import { createClient, createServiceClient } from "@/lib/supabase/server";

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
      .single();

    if (error && error.code !== 'PGRST116') {
      console.warn("[ANALYTICS_GET_ERROR]", error);
    }

    return new Response(JSON.stringify({ analytics: analytics || null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error("[ANALYTICS_GET_FATAL]", err);
    return new Response(JSON.stringify({ error: "Erro interno." }), {
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

    const { data: notebook } = await db.from("notebooks").select("name").eq("id", notebook_id).single();
    const notebookName = notebook?.name || "Disciplina";

    const { data: convs } = await db.from("conversations").select("id").eq("notebook_id", notebook_id);
    const convIds = (convs || []).map(c => c.id);

    let messagesHistory = "";
    if (convIds.length > 0) {
      const { data: msgs } = await db
        .from("messages")
        .select("role, content")
        .in("conversation_id", convIds)
        .order("created_at", { ascending: false })
        .limit(30);

      if (msgs && msgs.length > 0) {
        messagesHistory = msgs.reverse().map(m => `${m.role === 'user' ? 'Aluno' : 'IA'}: ${m.content.slice(0, 300)}`).join("\n---\n");
      }
    }

    const { data: materials } = await db.from("notebook_materials").select("title, extracted_text").eq("notebook_id", notebook_id).limit(5);
    const materialsSummary = (materials || []).map(m => `[Material: ${m.title}]: ${m.extracted_text || 'Anexo'}`).join("\n");

    const { data: notes } = await db.from("notebook_notes").select("title, content").eq("notebook_id", notebook_id).limit(5);
    const notesSummary = (notes || []).map(n => `[Nota: ${n.title}]: ${n.content}`).join("\n");

    if (!messagesHistory && !materialsSummary && !notesSummary) {
      const emptyAnalytics = { notebook_id, user_id: user.id, overall_score: 100, mastered_topics: [], review_topics: [], critical_topics: [] };
      return new Response(JSON.stringify({ analytics: emptyAnalytics }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    const promptPayload = `Você é o Auditor Pedagógico de IA do ExamSolver AI.
Sua missão é analisar o histórico do Caderno "${notebookName}" e produzir um DIAGNÓSTICO DE DOMÍNIO COGNITIVO.

CONTEXTO:
${materialsSummary}
${notesSummary}
${messagesHistory}

Responda ESTRITAMENTE em JSON puro:
{
  "overall_score": 75,
  "mastered_topics": [{"topic": "Tópico", "reason": "Por que"}],
  "review_topics": [{"topic": "Tópico", "reason": "Por que"}],
  "critical_topics": [{"topic": "Tópico", "reason": "Problema", "action_plan": "Como melhorar"}]
}`;

    const apiKey = process.env.CEREBRAS_API_KEY;
    if (!apiKey) throw new Error("CEREBRAS_API_KEY não configurada");

    const resIA = await fetch("https://api.cerebras.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: resolveModelId("gpt-oss-120b"),
        messages: [{ role: "system", content: "You output only valid JSON." }, { role: "user", content: promptPayload }],
        temperature: 0.2
      })
    });

    if (!resIA.ok) throw new Error("Erro na Cerebras API");
    const data = await resIA.json();
    let textResponse = data.choices[0].message.content.trim();

    if (textResponse.startsWith("```json")) {
      textResponse = textResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    }

    const aiData = JSON.parse(textResponse);

    const { data: upsertedData, error: upsertError } = await db
      .from("notebook_analytics")
      .upsert({
        notebook_id,
        user_id: user.id,
        overall_score: aiData.overall_score || 0,
        mastered_topics: aiData.mastered_topics || [],
        review_topics: aiData.review_topics || [],
        critical_topics: aiData.critical_topics || [],
        updated_at: new Date().toISOString()
      }, { onConflict: 'notebook_id' })
      .select()
      .single();

    if (upsertError) {
      console.error("[ANALYTICS_UPSERT_ERROR]", upsertError);
      return new Response(JSON.stringify({ error: upsertError.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ analytics: upsertedData }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error("[ANALYTICS_POST_FATAL]", err);
    return new Response(JSON.stringify({ error: "Erro interno ao gerar analytics." }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
