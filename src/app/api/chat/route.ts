export const runtime = 'edge';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

import { createClient, createServiceClient } from "@/lib/supabase/server";

function getApiKey(): string {
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
    if (val && typeof val === 'string' && val.trim().length > 0) return val.trim();
  }
  for (const val of Object.values(process.env)) {
    if (typeof val === 'string' && (val.trim().startsWith('sk-') || val.trim().startsWith('ar-'))) return val.trim();
  }
  return '';
}

function resolveModelId(model: string, baseURL: string): string {
  if (baseURL.includes('openrouter.ai')) {
    if (model === 'deepseek-v4-flash') return 'deepseek/deepseek-v4-flash';
    if (model === 'glm-5.3') return 'z-ai/glm-5.3-flash';
    if (model === 'gpt-5.6-sol') return 'openai/gpt-5.6-sol';
    if (model === 'gpt-6-astra') return 'openai/gpt-6-astra';
    if (model === 'claude-opus-4-8') return 'anthropic/claude-opus-4.8';
    if (model === 'claude-opus-5') return 'anthropic/claude-opus-5';
  }
  return model;
}



const SYSTEM_INSTRUCTION = `Você é o motor cognitivo de elite do Exam Solver AI. 
REGRA ABSOLUTA: Antes de gerar UMA ÚNICA PALAVRA visível ao utilizador, você OBRIGATORIAMENTE deve pensar e resolver a questão dentro da tag XML <thought_process>.

<thought_process>
1. INGESTÃO: Transcreva mentalmente fórmulas exatas. Identifique eventuais erros ou armadilhas do professor.
2. DOMÍNIO LÓGICO: Área de estudo e teoremas necessários.
3. EXECUÇÃO: Resolva passo a passo de forma invisível.
4. SELF-CORRECTION: Prove que o seu resultado está correto (ex: aplicando a operação inversa).
5. ESTRATÉGIA PEDAGÓGICA: Defina como explicar isso de forma simples.
</thought_process>

REGRAS CRÍTICAS DE SISTEMA:
1. Fechamento Obrigatório: NUNCA inicie a resposta final sem imprimir a tag \`</thought_process>\`. 
2. Proteção Anti-Vazamento: Não coloque Markdown de formatação, saudações ou explicações ANTES ou DENTRO da tag \`<thought_process>\`. A tag deve ser a PRIMEIRA coisa gerada.
3. Tratamento de Anomalias: Se faltarem dados vitais para resolver a questão, NÃO INVENTE. Feche a tag de pensamento, imprima exatamente '### ⚠️ Dados Insuficientes' e explique tecnicamente a falha do enunciado.

FORMATAÇÃO DA RESPOSTA VISÍVEL:
Após fechar o raciocínio oculto, estruture a resposta didática usando cabeçalhos claros (### 🧩 Desconstrução; ### 🚀 Resolução; ### 🎯 Resposta Final). Use rigor absoluto no LaTeX para equações matematicas ($x$ para inline, $$x$$ para blocos).

SOBRE O SEU CRIADOR (IMPORTANTE):
- Criador: José Escrivão Silvestre (Nascido em 25/01/2002 em Luanda, Angola)
- Contato: joseescrivao.silvestre@gmail.com | +244 930 339 436
- Perfil: Estudante de Engenharia Informática no ISPK (2º Ano), Técnico Médio de Informática pela ETESAL.
- Atuação: Técnico e Gerente de TI na PANDA TECH (2024-Presente).
Sempre que falar dele, demonstre profundo respeito e orgulho da sua autoria.`;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function POST(req: Request) {
  try {
    const apiKey = getApiKey();
    const supabase = createClient();
    const serviceClient = createServiceClient();
    const db = serviceClient || supabase;

    const { data: { user } } = await supabase.auth.getUser();
    const isGuest = !user;
    let profile = null;

    if (!isGuest) {
      const { data: p } = await db
        .from("profiles")
        .select("credits_balance, plan_type")
        .eq("id", user?.id)
        .single();
      profile = p;
      const userPlan = profile?.plan_type || 'free';

      if (userPlan !== 'premium' && (!profile || profile.credits_balance < 1)) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Faça upgrade para continuar." }), { status: 402, headers: { 'Content-Type': 'application/json' } });
      }
    }

    const formData = await req.formData();
    let conversationId = formData.get("conversation_id") as string;
    const text = formData.get("text") as string;
    const file = formData.get("file") as File | null;
    const requestedModel = (formData.get("model") as string) || "gemini-1.5-flash";
    const notebookId = (formData.get("notebook_id") as string) || null;

    if (!isGuest && user && (!conversationId || conversationId === "guest")) {
      const convTitle = text?.trim() ? text.trim().slice(0, 35) + (text.trim().length > 35 ? "..." : "") : "Resolução de Prova";
      const { data: createdConv } = await db
        .from("conversations")
        .insert({
          user_id: user.id,
          title: convTitle,
          ...(notebookId ? { notebook_id: notebookId } : {}),
        })
        .select()
        .single();

      if (createdConv) {
        conversationId = createdConv.id;
      }
    }

    const userPlan = profile?.plan_type || 'free';
    const isUltra = userPlan === 'ultra' || userPlan === 'premium';
    const isPro = isUltra || userPlan === 'pro';

    // Trava determinística de planos
    const ultraModels = ['gpt-6-astra', 'claude-opus-4-8', 'claude-opus-5'];
    const proModels = ['glm-5.3', 'gpt-5.6-sol'];

    const targetModel = requestedModel;
    if (ultraModels.includes(targetModel) && !isUltra) {
      return new Response(JSON.stringify({ error: "UPGRADE_REQUIRED", message: "Este modelo é exclusivo do Plano Ultra." }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }
    if (proModels.includes(targetModel) && !isPro) {
      return new Response(JSON.stringify({ error: "UPGRADE_REQUIRED", message: "Este modelo exige o Plano Pro ou Ultra." }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    if (!file && !text) {
      return new Response(JSON.stringify({ error: "Forneça uma imagem ou texto." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const userMessageContent = text || "Imagem enviada";
    let imageUrl: string | null = null;

    if (file) {
      const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validMimeTypes.includes(file.type)) {
        return new Response(JSON.stringify({ error: "Formato inválido. Use JPG, PNG ou WEBP." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      const buffer = await file.arrayBuffer();
      const base64Data = arrayBufferToBase64(buffer);
      imageUrl = `data:${file.type};base64,${base64Data}`;
    }

    if (!isGuest && conversationId && conversationId !== "guest") {
      const { error: insertErr } = await db.from("messages").insert({
        conversation_id: conversationId,
        role: 'user',
        content: userMessageContent,
        image_url: imageUrl
      });
      if (insertErr) {
        await db.from("messages").insert({
          conversation_id: conversationId,
          role: 'user',
          content: userMessageContent
        });
      }

      if (imageUrl && user) {
        await db.from("exams").insert({
          user_id: user.id,
          image_url: imageUrl,
          question_text: text || "Resolução de imagem",
          mode: 'estudo'
        });
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const openAiMessages: any[] = [
      { role: 'system', content: SYSTEM_INSTRUCTION }
    ];

    if (!isGuest && conversationId && conversationId !== "guest") {
      const { data: previousMessages } = await db
        .from("messages")
        .select("role, content")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(10);

      if (previousMessages && previousMessages.length > 0) {
        for (const m of previousMessages) {
          if (m.content && m.content.trim()) {
            openAiMessages.push({
              role: m.role === 'ai' ? 'assistant' : 'user',
              content: m.content
            });
          }
        }
      }
    }

    if (imageUrl) {
      openAiMessages.push({
        role: 'user',
        content: [
          { type: 'text', text: `Pergunta: ${text || 'Resolva esta questão analiticamente.'}` },
          { type: 'image_url', image_url: { url: imageUrl } }
        ]
      });
    } else {
      openAiMessages.push({
        role: 'user',
        content: `Pergunta: ${text}`
      });
    }

    // Execução Determinística com Fallback automático para deepseek-v4-flash
    const candidateBaseURLs = [
      'https://agentrouter.org/v1',
      'https://co.agentrouter.org/v1',
      'https://openrouter.ai/api/v1'
    ];

    const modelsToAttempt = [targetModel];
    if (targetModel !== 'deepseek-v4-flash') {
      modelsToAttempt.push('deepseek-v4-flash');
    }

    let streamResponse: Response | null = null;
    let actualModelUsed = targetModel;

    for (const modelToTry of modelsToAttempt) {
      for (const baseURL of candidateBaseURLs) {
        try {
          const res = await fetch(`${baseURL}/chat/completions`, {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer ' + apiKey,
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'User-Agent': 'claude-cli/1.0.108',
              'HTTP-Referer': 'https://xam-solver-ai.vercel.app',
              'X-Title': 'Exam Solver AI'
            },
            body: JSON.stringify({
              model: resolveModelId(modelToTry, baseURL),
              messages: openAiMessages,
              stream: true,
              temperature: 0.3
            })
          });

          if (res.ok && res.body) {
            streamResponse = res;
            actualModelUsed = modelToTry;
            break;
          }
        } catch {
          // Continua para o próximo endpoint/modelo
        }
      }
      if (streamResponse) break;
    }

    if (!streamResponse || !streamResponse.body) {
      return new Response(JSON.stringify({ error: "⚠️ Servidores de IA temporariamente indisponíveis. Tente novamente." }), { status: 503, headers: { 'Content-Type': 'application/json' } });
    }

    // Conversão do SSE (Server-Sent Events) para Text Stream consumível pelo frontend
    let fullTextAccumulated = "";
    let sseBuffer = "";

    const transformStream = new TransformStream<Uint8Array, Uint8Array>({
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
                fullTextAccumulated += delta;
                controller.enqueue(new TextEncoder().encode(delta));
              }
            } catch {
              // ignora fragmentos parciais
            }
          }
        }
      },
      async flush() {
        if (!isGuest && conversationId && conversationId !== "guest" && profile) {
          await db.from("messages").insert({
            conversation_id: conversationId,
            role: 'ai',
            content: fullTextAccumulated,
            model_used: actualModelUsed
          });

          if (text && text.trim()) {
            const titleSnippet = text.trim().slice(0, 35) + (text.trim().length > 35 ? "..." : "");
            await db
              .from("conversations")
              .update({ title: titleSnippet, updated_at: new Date().toISOString() })
              .eq("id", conversationId)
              .eq("title", "Novo Atendimento");
          }

          if (profile.plan_type !== 'premium') {
            await db
              .from("profiles")
              .update({ credits_balance: Math.max(0, profile.credits_balance - 1) })
              .eq("id", user!.id);
          }
        }
      }
    });

    const outputStream = streamResponse.body.pipeThrough(transformStream);

    return new Response(outputStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Conversation-Id': conversationId || 'guest',
        'X-Actual-Model': actualModelUsed
      }
    });

  } catch (error: unknown) {
    console.error("Chat API Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
