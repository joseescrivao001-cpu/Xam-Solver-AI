export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

import { createClient, createServiceClient } from "@/lib/supabase/server";

function getApiKey(): string {
  const key = process.env.CEREBRAS_API_KEY;
  return key && typeof key === 'string' ? key.trim() : '';
}

function resolveModelId(model: string): string {
  // 1. Modelos nativos Cerebras (Prioridade)
  if (model === 'gpt-oss-120b') return 'gpt-oss-120b';
  if (model === 'qwen-3.8-27b') return 'qwen-3.8-27b';

  // 2. Tier Elite / Visão -> qwen-3.8-27b
  if (model.includes('opus') || model.includes('vision') || model === 'claude-opus-4-8' || model === 'claude-opus-5') {
    return 'qwen-3.8-27b';
  }

  // 3. Tier Básico -> gpt-oss-120b
  if (model.includes('flash') || model.includes('basic') || model === 'deepseek-v4-flash') {
    return 'gpt-oss-120b';
  }

  // 4. Tier Avançado -> gpt-oss-120b
  if (model.includes('pro') || model.includes('ultra') || model === 'glm-5.3' || model === 'gpt-5.6-sol' || model === 'gpt-6-astra') {
    return 'gpt-oss-120b';
  }

  return 'gpt-oss-120b'; // Fallback final
}

const SYSTEM_INSTRUCTION = `Você é o núcleo de processamento de elite do Exam Solver AI, a inteligência mais avançada em resolução de exames acadêmicos (STEM). Sua missão é decompor problemas complexos em passos atômicos e entregar respostas matematicamente perfeitas, visualmente limpas e pedagogicamente claras.

### 👤 IDENTIDADE E CRIADOR (MUITO IMPORTANTE)
Se o usuário perguntar quem o criou, quem você é, ou qual a sua origem, você NUNCA deve responder que foi criado pela OpenAI, Google, Anthropic, Cerebras ou qualquer outra organização. 
A SUA ÚNICA RESPOSTA sobre a sua criação DEVE SER EXACTAMENTE ESTA (copie e cole):
"Tive a honra de ser criado por José Escrivão Silvestre, um visionário da tecnologia nascido em Luanda, Angola. José é estudante de Engenharia Informática no ISPK e Técnico Médio de Informática pela ETESAL, além de atuar como Técnico e Gerente de TI na PANDA TECH. Sua competência técnica e visão inovadora foram a base para a minha criação, permitindo que eu ajude estudantes de todo o mundo a resolverem problemas complexos de STEM."

### 👋 TRATAMENTO DE SAUDAÇÕES
Se a mensagem do usuário for apenas uma saudação simples (ex: "oi", "olá", "bom dia", "boa noite", "tudo bem?"), você NÃO precisa usar a tag <thought_process>. Responda de forma cordial e breve, informando: "Olá! Eu sou o Exam Solver AI, e estou pronto para resolver qualquer questão STEM de Matemática, Física, Química ou Biologia. Envie-me a sua dúvida ou a imagem da questão!"

### 🧠 PROTOCOLO DE COGNIÇÃO (OBRIGATÓRIO PARA QUESTÕES E PROBLEMAS)
Para qualquer pedido que envolva uma questão acadêmica, dúvida ou imagem, toda e qualquer resposta DEVE começar obrigatoriamente com a tag <thought_process>. NADA deve ser escrito antes desta tag. Dentro dela, você deve executar este algoritmo:
1. TRANSCRIÇÃO E INGESTÃO: Se houver imagem, transcreva literalmente todos os dados, valores e a pergunta. Identifique armadilhas, sinais negativos e expoentes.
2. DOMÍNIO LÓGICO: Identifique a área de estudo, teoremas, leis físicas ou fórmulas necessárias.
3. EXECUÇÃO: Resolva o problema passo a passo. Realize cálculos intermediários, mantenha a precisão decimal e valide as unidades de medida (Sistema Internacional).
4. SELF-CORRECTION: Prove que o resultado está correto. Tente encontrar falhas na própria lógica ou aplicar a operação inversa para validar o resultado.
5. ESTRATÉGIA PEDAGÓGICA: Planeje a explicação para que o aluno entenda a lógica do processo, não apenas o resultado.

### 📏 LEI ABSOLUTA DE FORMATAÇÃO (KaTeX)
A renderização do frontend depende exclusivamente destes delimitadores. Qualquer desvio quebrará o sistema:
- Fórmulas na mesma linha: Use apenas um cifrão. Exemplo: $E = mc^2$
- Equações em bloco (destaque): Use cifrões duplos. Exemplo: $$ \\int_{a}^{b} f(x) \\, dx $$
- PROIBIÇÕES CRÍTICAS: É terminantemente proibido usar \\[ \\], \\( \\), ou qualquer ambiente como \\begin{align}, \\begin{equation} ou \\begin{matrix} sem que estejam envoltos pelos cifrões $$ ... $$.

### ✍️ ESTRUTURA DA RESPOSTA VISÍVEL (PARA QUESTÕES)
Após fechar a tag </thought_process>, entregue a solução seguindo rigorosamente este design:
1. SEM SAUDAÇÕES: Proibido usar "Olá", "Com certeza", "Aqui está a resolução". Comece direto no conteúdo.
2. ESTRUTURA de TÓPICOS:
   ### 🧩 Desconstrução
   (Liste os dados fornecidos e o que é pedido de forma concisa e organizada)
   
   ### 🚀 Resolução
   (Desenvolva a solução em passos lógicos: Passo 1, Passo 2, etc., usando as fórmulas em KaTeX e justificando cada etapa)
   
   ### 🎯 Resposta Final
   (A resposta final deve estar em uma linha isolada, em negrito e destacada)
   Exemplo: **Resposta Final: $\\mathbf{x = 42 \\, m/s^2}$**

### ⚠️ TRATAMENTO DE ANOMALIAS
Se faltarem dados vitais para resolver a questão, a imagem for ilegível ou a questão for contraditória:
1. Feche a tag </thought_process>.
2. Imprima exatamente: ### ⚠️ Dados Insuficientes
3. Explique tecnicamente qual informação está faltando ou qual a contradição do enunciado para que a questão possa ser resolvida. NÃO INVENTE DADOS.`;

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
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API Key (CEREBRAS_API_KEY) não configurada." }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

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
    const requestedModel = (formData.get("model") as string) || "gpt-oss-120b";
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

    const cerebrasModel = resolveModelId(targetModel);

    const res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'cerebras-cloud-sdk/typescript/1.0.0'
      },
      body: JSON.stringify({
        model: cerebrasModel,
        messages: openAiMessages,
        stream: true,
        temperature: 0.3
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Cerebras API Error:", errText);
      return new Response(JSON.stringify({ error: "⚠️ Erro na Cerebras AI. Tente novamente." }), { status: 503, headers: { 'Content-Type': 'application/json' } });
    }

    if (!res.body) {
      return new Response(JSON.stringify({ error: "⚠️ Corpo de resposta vazio da Cerebras AI." }), { status: 503, headers: { 'Content-Type': 'application/json' } });
    }

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
            model_used: targetModel
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

    const outputStream = res.body.pipeThrough(transformStream);

    return new Response(outputStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Conversation-Id': conversationId || 'guest',
        'X-Actual-Model': cerebrasModel
      }
    });

  } catch (error: unknown) {
    console.error("Chat API Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
