export const runtime = 'edge';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";
import { streamText } from "ai";

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

    const userPlan = profile?.plan_type || 'pro';
    if (requestedModel === 'gemini-1.5-pro' && userPlan !== 'ultra' && userPlan !== 'premium') {
      return new Response(JSON.stringify({ error: "UPGRADE_REQUIRED", message: "O modelo Gemini Pro é exclusivo dos planos Ultra e Premium." }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    if (!file && !text) {
      return new Response(JSON.stringify({ error: "Forneça uma imagem ou texto." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const userMessageContent = text || "Imagem enviada";
    let imageUrl: string | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userPromptParts: any[] = [];

    if (file) {
      const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validMimeTypes.includes(file.type)) {
        return new Response(JSON.stringify({ error: "Formato inválido. Use JPG, PNG ou WEBP." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      const buffer = await file.arrayBuffer();
      const base64Data = arrayBufferToBase64(buffer);
      imageUrl = `data:${file.type};base64,${base64Data}`;
      
      userPromptParts.push({
        type: 'image',
        image: buffer
      });
    }

    if (text) {
      userPromptParts.push({ type: 'text', text: `Pergunta: ${text}` });
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
    const coreMessages: any[] = [];
    if (!isGuest && conversationId && conversationId !== "guest") {
      const { data: historyData } = await db
        .from("messages")
        .select("role, content")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (historyData && historyData.length > 0) {
        // Como buscamos DESC para pegar os últimos 20, invertemos para ficar na ordem cronológica ASC
        historyData.reverse();
        
        // Remove a mensagem atual (que foi a última a ser inserida no topo)
        const previousMsgs = historyData.slice(0, -1);
        
        for (const m of previousMsgs) {
          if (!m.content || !m.content.trim()) continue;
          
          // O Vercel AI SDK usa padronizadamente 'user' e 'assistant' (e internamente mapeia para 'model' do Gemini)
          coreMessages.push({
            role: m.role === 'ai' ? 'assistant' : 'user',
            content: m.content
          });
        }
      }
    }

    // A mensagem atual é o último elemento do coreMessages
    coreMessages.push({
      role: 'user',
      content: userPromptParts
    });

    // Análise de Intenção (Fase 1: Otimização do Motor)
    const lowerText = text.toLowerCase();
    const isMathOrPhysics = lowerText.match(/calcule|resolva|equação|integral|derivada|física|matemática|velocidade|aceleração|x|y/);
    const useTools = !isMathOrPhysics; // Se for puramente matemático, desligamos as ferramentas
    const temp = isMathOrPhysics ? 0.1 : 0.4; // Menos entropia para raciocínio exato

    // @ai-sdk/google tools
    const tools = useTools ? {
      googleSearch: google.tools.googleSearch({
        dynamicRetrievalConfig: { mode: 'dynamic', dynamicThreshold: 0.3 }
      })
    } : undefined;

    const TIERS = [
      { provider: 'google', id: 'gemini-1.5-pro-latest', label: 'Tier 1' },
      { provider: 'google', id: 'gemini-1.5-flash', label: 'Tier 2' },
      { provider: 'groq', id: 'llama-3.3-70b-versatile', label: 'Tier 3 Nuclear' }
    ];

    const startIndex = requestedModel === 'gemini-1.5-pro' ? 0 : 1;
    const activeTiers = TIERS.slice(startIndex);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let streamResult: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let usedTier: any = null;

    for (const tier of activeTiers) {
      // @ts-expect-error globalThis augmentation
      if (!globalThis.circuitState) {
        // @ts-expect-error globalThis augmentation
        globalThis.circuitState = {
          'gemini-1.5-pro-latest': { fails: 0, lastFail: 0 },
          'gemini-1.5-flash': { fails: 0, lastFail: 0 },
          'llama-3.3-70b-versatile': { fails: 0, lastFail: 0 }
        };
      }
      
      // @ts-expect-error globalThis augmentation
      const state = globalThis.circuitState[tier.id];
      if (state.fails >= 3) {
        if (Date.now() - state.lastFail < 5 * 60 * 1000) {
          console.warn(`[CIRCUIT BREAKER] Modelo ${tier.id} bloqueado por 5 minutos. Pulando...`);
          continue;
        } else {
          state.fails = 0;
        }
      }

      try {
        const aiModel = tier.provider === 'groq' ? groq(tier.id) : google(tier.id);
        const toolsToUse = tier.provider === 'groq' ? undefined : tools;

        streamResult = await streamText({
          model: aiModel,
          system: SYSTEM_INSTRUCTION,
          messages: coreMessages,
          temperature: temp,
          tools: toolsToUse,
          async onFinish({ text: finalResponseText }) {
            if (!isGuest && conversationId && conversationId !== "guest" && profile) {
              const { error: insertError } = await db.from("messages").insert({
                conversation_id: conversationId,
                role: 'ai',
                content: finalResponseText,
                model_used: tier.label
              });

              if (text && text.trim()) {
                const titleSnippet = text.trim().slice(0, 35) + (text.trim().length > 35 ? "..." : "");
                await db
                  .from("conversations")
                  .update({ title: titleSnippet, updated_at: new Date().toISOString() })
                  .eq("id", conversationId)
                  .eq("title", "Novo Atendimento");
              }

              // Dupla confirmação de safe-charge
              const hasMinLength = finalResponseText.length > 50;
              const isNotErrorMsg = !finalResponseText.includes("### ⚠️ Dados Insuficientes");
              const hasThoughtTag = finalResponseText.includes("</thought_process>");

              if (!insertError && profile.plan_type !== 'premium') {
                if (hasMinLength && isNotErrorMsg && hasThoughtTag) {
                  await db
                    .from("profiles")
                    .update({ credits_balance: Math.max(0, profile.credits_balance - 1) })
                    .eq("id", user!.id);
                }
              }
            }
          }
        });

        usedTier = tier;
        break; // Sucesso, sai do loop
      } catch (err) {
        console.error(`[FAILOVER] Falha no ${tier.label} (${tier.id}):`, err);
        state.fails++;
        state.lastFail = Date.now();
      }
    }

    if (!streamResult) {
      return new Response(JSON.stringify({ error: "⚠️ Todos os motores estão ocupados. Tente novamente em instantes." }), { status: 503, headers: { 'Content-Type': 'application/json' } });
    }

    return streamResult.toTextStreamResponse({
      headers: {
        'X-Conversation-Id': conversationId || 'guest',
        'X-Actual-Model': usedTier.label
      }
    });
  } catch (error: unknown) {
    console.error("Chat API Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
