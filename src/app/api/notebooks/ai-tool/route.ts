export const runtime = 'edge';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const serviceClient = createServiceClient();
    const db = serviceClient || supabase;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autenticado." }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const { notebook_id, action, conversation_id } = await req.json();
    if (!notebook_id || !action) {
      return new Response(JSON.stringify({ error: "notebook_id e action são obrigatórios." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // 1. Obter informacoes do Caderno
    const { data: notebook } = await db
      .from("notebooks")
      .select("name, description")
      .eq("id", notebook_id)
      .single();

    const notebookName = notebook?.name || "Ambiente de Estudo";

    // 2. Coletar conversas vinculadas a este caderno
    const { data: convs } = await db
      .from("conversations")
      .select("id, title")
      .eq("notebook_id", notebook_id)
      .order("created_at", { ascending: false })
      .limit(10);

    const convIds = (convs || []).map(c => c.id);

    // 3. Coletar histórico
    let recentMessagesText = "";
    if (convIds.length > 0) {
      const { data: msgs } = await db
        .from("messages")
        .select("role, content")
        .in("conversation_id", convIds)
        .order("created_at", { ascending: false })
        .limit(25);

      if (msgs && msgs.length > 0) {
        recentMessagesText = msgs
          .reverse()
          .map(m => `${m.role === 'user' ? 'Aluno' : 'IA'}: ${m.content.slice(0, 400)}`)
          .join("\n---\n");
      }
    }

    // 4. Coletar anotacoes e materiais
    const { data: notes } = await db
      .from("notebook_notes")
      .select("title, content")
      .eq("notebook_id", notebook_id)
      .limit(5);

    const notesSummary = (notes || []).map(n => `[Anotação: ${n.title}]: ${n.content}`).join("\n");

    const { data: materials } = await db
      .from("notebook_materials")
      .select("title, file_type, extracted_text")
      .eq("notebook_id", notebook_id)
      .limit(5);

    const materialsSummary = (materials || [])
      .map(m => `[Material: ${m.title} (${m.file_type})]: ${m.extracted_text || 'Anexo disponível'}`)
      .join("\n");

    let promptTask = "";
    if (action === "summarize") {
      promptTask = `AÇÃO: [RESUMIR MATÉRIA]
Analise todo o histórico de conversas, materiais e notas deste caderno e produza um Resumo Acadêmico Estruturado de Alto Nível sobre a disciplina "${notebookName}".
Formate com:
1. Conceitos Fundamentais e Definições
2. Fórmulas, Leis e Regras Práticas (em LaTeX formatado)
3. Pegadinhas de Prova e Pontos Críticos
4. Resumo Executivo em 3 Linhas`;
    } else if (action === "exercises") {
      promptTask = `AÇÃO: [CRIAR EXERCÍCIOS]
Com base exclusivamente nos tópicos e dificuldades abordados neste caderno "${notebookName}", crie 4 questões inéditas no formato de exame (2 de Múltipla Escolha e 2 Dissertativas/Cálculo).
Para cada questão, inclua:
- Enunciado claro
- Alternativas (quando aplicável)
- Resolução passo a passo oculta sob tag [GABARITO DETALHADO]`;
    } else if (action === "quiz") {
      promptTask = `AÇÃO: [FAZER REVISÃO EXPRESSA (QUIZ)]
Gere um Quiz Rápido de 3 Perguntas Desafiadoras sobre os pontos mais debatidos no caderno "${notebookName}".
Apresente cada pergunta com opções [A], [B], [C], [D] e um convite para o aluno responder a primeira questão para você validar!`;
    } else if (action === "explain_errors") {
      promptTask = `AÇÃO: [EXPLICAR MEUS ERROS]
Analise as mensagens e histórico do caderno "${notebookName}". Identifique onde o aluno teve dúvidas, hesitações ou cometeu erros conceituais e matemáticos.
Explique didaticamente:
1. Qual foi a principal falha ou confusão comum percebida
2. Por que esse erro acontece com frequência
3. A regra de ouro ou método infalível para nunca mais errar isso na prova`;
    }

    const contextPayload = `
DISCIPLINA / CADERNO: ${notebookName}
NOTAS DO ALUNO:
${notesSummary || "Nenhuma anotação formal cadastrada ainda."}

MATERIAIS E ANEXOS:
${materialsSummary || "Nenhum documento textual anexado."}

HISTÓRICO RECENTE DE PERGUNTAS E RESPOSTAS:
${recentMessagesText || "O aluno acabou de iniciar este caderno."}

TAREFA ESPECÍFICA:
${promptTask}
`;

    const apiKey = process.env.CEREBRAS_API_KEY;
    if (!apiKey) throw new Error("CEREBRAS_API_KEY não configurada");

    const res = await fetch("https://api.cerebras.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3.1-70b",
        messages: [
          { role: "system", content: `Você é o Tutor de Estudos Especialista do ExamSolver AI para a disciplina de ${notebookName}. Você tem acesso total ao ecossistema e histórico do caderno do aluno. Responda em tom acadêmico encorajador, com rigor conceitual e formatação Markdown/LaTeX impecável.` },
          { role: "user", content: contextPayload }
        ],
        stream: true,
        temperature: 0.3
      })
    });

    if (!res.ok) {
      console.error("[Cerebras Error]:", await res.text());
      return new Response(JSON.stringify({ error: "Modelo de IA temporariamente indisponível." }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    let fullText = "";
    let sseBuffer = "";
    
    const transformStream = new TransformStream({
      transform(chunk, controller) {
        sseBuffer += new TextDecoder("utf-8").decode(chunk);
        const lines = sseBuffer.split("\n");
        sseBuffer = lines.pop() || "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === "data: [DONE]") continue;
          if (trimmed.startsWith("data: ")) {
            try {
              const json = JSON.parse(trimmed.slice(6));
              const delta = json.choices?.[0]?.delta?.content || "";
              if (delta) {
                fullText += delta;
                controller.enqueue(new TextEncoder().encode(delta));
              }
            } catch { /* ignore */ }
          }
        }
      },
      async flush() {
        if (conversation_id && conversation_id !== "guest" && fullText.trim().length > 5) {
          await db.from("messages").insert({
            conversation_id,
            role: "ai",
            content: fullText,
          });
        }
      }
    });

    return new Response(res.body.pipeThrough(transformStream), {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      }
    });

  } catch (err) {
    console.error("[NOTEBOOK_AI_TOOL_FATAL]", err);
    return new Response(JSON.stringify({ error: "Erro interno no processamento da ferramenta de IA." }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
