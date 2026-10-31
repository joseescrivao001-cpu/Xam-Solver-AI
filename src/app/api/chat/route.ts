export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isUuid, ownsConversation, ownsNotebook } from "@/lib/access";
import { consumeCredit, hasAccess, readPlan, refundCredit } from "@/lib/credits";
import { clientKey, hit, rateLimitHeaders } from "@/lib/rate-limit";
import {
  GUEST_FREE_ATTEMPTS,
  guestLimitReached,
  guestUsageCookie,
  readGuestUsage,
} from "@/lib/guest-quota";
import { apiError, logError } from "@/lib/http";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");

/** Limite prudente: a Vercel corta pedidos serverless em 4,5 MB. */
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

function getApiKey(): string {
  const key = process.env.CEREBRAS_API_KEY;
  return key && typeof key === 'string' ? key.trim() : '';
}

function resolveChatModel(model: string): string {
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

### 🌍 IDIOMA OBRIGATÓRIO (LEI INVIOLÁVEL)
VOCÊ DEVE SEMPRE RESPONDER EM PORTUGUÊS BRASILEIRO. Esta é a única língua aceita. Nunca escreva uma única palavra em inglês, francês ou qualquer outro idioma, independentemente de qualquer circunstância, pedido ou contexto. SEMPRE EM PORTUGUÊS.

### 🖼️ PROCESSAMENTO DE IMAGENS
Quando o utilizador enviar uma imagem (foto de prova, exercício escrito, diagrama), ela será incluída na mensagem como base64 inline. Você DEVE analisá-la completamente, transcrever os dados visíveis e resolver a questão. Se por algum motivo técnico a imagem não for processável, informe em Português que houve um erro de leitura da imagem e peça ao utilizador para enviar novamente.

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
      return apiError("upstream_unavailable", {
        scope: "[CHAT]",
        message: "Serviço de IA não configurado. Contacte o suporte.",
      });
    }

    const supabase = createClient();
    const db = createServiceClient() || supabase;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const isGuest = !user;

    // ── Limite de pedidos ────────────────────────────────────────────────
    const limit = hit(clientKey(req, user?.id), isGuest ? 10 : 40, 60_000);
    if (!limit.ok) {
      return apiError("rate_limited", {
        scope: "[CHAT]",
        headers: rateLimitHeaders(limit),
        message: `Demasiados pedidos. Tente novamente em ${limit.retryAfterSeconds}s.`,
      });
    }

    // ── Quota de convidado (servidor, cookie assinada) ────────────────────
    const guestUsed = readGuestUsage(req);
    let setGuestCookie: string | null = null;

    if (isGuest) {
      if (guestLimitReached(guestUsed)) {
        return apiError("upgrade_required", {
          scope: "[CHAT]",
          message: `Atingiu o limite de ${GUEST_FREE_ATTEMPTS} resoluções gratuitas. Crie uma conta para continuar.`,
          extra: { code: "GUEST_LIMIT_REACHED" },
        });
      }
      setGuestCookie = guestUsageCookie(guestUsed + 1);
    }

    // ── Plano e créditos (lidos do servidor, nunca do cliente) ────────────
    let plan = { planType: "guest", creditsBalance: 0, exists: false };

    if (user) {
      plan = await readPlan(db, user.id);
      if (!hasAccess(plan)) {
        return apiError("insufficient_credits", {
          scope: "[CHAT]",
          message: "Créditos insuficientes. Faça upgrade para continuar.",
        });
      }
    }

    // ── Entrada ───────────────────────────────────────────────────────────
    const formData = await req.formData();
    let conversationId = formData.get("conversation_id") as string;
    const text = (formData.get("text") as string) || "";
    const file = formData.get("file") as File | null;
    const requestedModel = (formData.get("model") as string) || "gpt-oss-120b";
    const notebookId = (formData.get("notebook_id") as string) || null;

    // ── Isolamento de dados ───────────────────────────────────────────────
    if (!isGuest && user) {
      if (isUuid(conversationId) && !(await ownsConversation(db, conversationId, user.id))) {
        return apiError("not_found", { scope: "[CHAT]", message: "Conversa não encontrada." });
      }
      if (notebookId && !(await ownsNotebook(db, notebookId, user.id))) {
        return apiError("not_found", { scope: "[CHAT]", message: "Caderno não encontrado." });
      }
    } else {
      conversationId = "guest";
    }

    // ── Gating de modelos por plano ───────────────────────────────────────
    const isTopTier = plan.planType === 'ultra' || plan.planType === 'premium';
    const isProTier = isTopTier || plan.planType === 'pro';

    if (['gpt-6-astra', 'claude-opus-4-8', 'claude-opus-5'].includes(requestedModel) && !isTopTier) {
      return apiError("upgrade_required", {
        scope: "[CHAT]",
        message: "Este modelo é exclusivo do Plano Ultra.",
        extra: { code: "UPGRADE_REQUIRED" },
      });
    }
    if (['glm-5.3', 'gpt-5.6-sol'].includes(requestedModel) && !isProTier) {
      return apiError("upgrade_required", {
        scope: "[CHAT]",
        message: "Este modelo exige o Plano Pro ou Ultra.",
        extra: { code: "UPGRADE_REQUIRED" },
      });
    }

    if (!file && !text.trim()) {
      return apiError("invalid_input", {
        scope: "[CHAT]",
        message: "Forneça uma imagem, um PDF ou texto.",
      });
    }

    // ── Ficheiro enviado ──────────────────────────────────────────────────
    let imageUrl: string | null = null;
    let pdfExtractedText: string | null = null;
    let isPdf = false;

    if (file) {
      if (!ALLOWED_MIME.includes(file.type)) {
        return apiError("invalid_input", {
          scope: "[CHAT]",
          message: "Formato inválido. Use JPG, PNG, WEBP ou PDF.",
        });
      }

      if (file.size > MAX_UPLOAD_BYTES) {
        return apiError("payload_too_large", {
          scope: "[CHAT]",
          message: "O ficheiro excede 4 MB. Reduza a qualidade da foto e tente novamente.",
        });
      }

      isPdf = file.type === 'application/pdf';
      const buffer = await file.arrayBuffer();

      if (isPdf) {
        // BUGFIX: este ramo enviava `null` ao modelo — o texto nunca era
        // extraído. Passa a extrair de facto; se falhar, envia-se o PDF em
        // base64 para o modelo de visão conseguir ler as páginas.
        try {
          const parsed = await pdfParse(Buffer.from(buffer));
          const extracted = typeof parsed?.text === 'string' ? parsed.text.trim() : '';
          pdfExtractedText = extracted.length > 0 ? extracted : null;
        } catch (err) {
          logError("[CHAT] Falha ao extrair texto do PDF", err);
          pdfExtractedText = null;
        }

        if (!pdfExtractedText) {
          imageUrl = `data:application/pdf;base64,${arrayBufferToBase64(buffer)}`;
        }
      } else {
        imageUrl = `data:${file.type};base64,${arrayBufferToBase64(buffer)}`;
      }
    }

    // ── Persistência inicial ──────────────────────────────────────────────
    if (!isGuest && user && (!conversationId || conversationId === "guest")) {
      const convTitle = text.trim()
        ? text.trim().slice(0, 35) + (text.trim().length > 35 ? "..." : "")
        : "Resolução de Prova";

      const { data: createdConv } = await db
        .from("conversations")
        .insert({
          user_id: user.id,
          title: convTitle,
          ...(notebookId ? { notebook_id: notebookId } : {}),
        })
        .select()
        .single();

      if (createdConv) conversationId = createdConv.id;
    }

    if (!isGuest && user && conversationId && conversationId !== "guest") {
      const { error: insertErr } = await db.from("messages").insert({
        conversation_id: conversationId,
        role: 'user',
        content: text || (isPdf ? "Documento PDF enviado" : "Imagem enviada"),
        image_url: imageUrl,
      });

      if (insertErr) {
        await db.from("messages").insert({
          conversation_id: conversationId,
          role: 'user',
          content: text || (isPdf ? "Documento PDF enviado" : "Imagem enviada"),
        });
      }
    }

    // ── Contexto do caderno ───────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const openAiMessages: any[] = [{ role: 'system', content: SYSTEM_INSTRUCTION }];

    if (!isGuest && notebookId) {
      const { data: materials } = await db
        .from("notebook_materials")
        .select("title, file_type, extracted_text")
        .eq("notebook_id", notebookId)
        .eq("user_id", user!.id);

      const { data: notes } = await db
        .from("notebook_notes")
        .select("title, content")
        .eq("notebook_id", notebookId)
        .eq("user_id", user!.id);

      let contextStr = "CONTEXTO DO CADERNO DE ESTUDOS:\n";
      if (materials && materials.length > 0) {
        contextStr += "MATERIAIS ANEXADOS:\n";
        materials.forEach((m) => {
          contextStr += `[Material: ${m.title}]: ${m.extracted_text || "Documento vazio"}\n\n`;
        });
      }
      if (notes && notes.length > 0) {
        contextStr += "ANOTAÇÕES DO ALUNO:\n";
        notes.forEach((n) => {
          contextStr += `[Nota: ${n.title}]: ${n.content}\n\n`;
        });
      }

      if (materials?.length || notes?.length) {
        openAiMessages.push({ role: "system", content: contextStr });
      }
    }

    // ── Histórico da conversa ─────────────────────────────────────────────
    if (!isGuest && user && conversationId && conversationId !== "guest") {
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
              content: m.content,
            });
          }
        }
      }
    }

    const question = text || 'Resolva esta questão analiticamente.';

    if (imageUrl) {
      openAiMessages.push({
        role: 'user',
        content: [
          { type: 'text', text: `Pergunta: ${question}` },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      });
    } else if (pdfExtractedText) {
      openAiMessages.push({
        role: 'user',
        content: `[CONTEÚDO DO PDF EXTRAÍDO]:\n\n${pdfExtractedText}\n\nPergunta do Usuário: ${question}`,
      });
    } else {
      openAiMessages.push({ role: 'user', content: `Pergunta: ${question}` });
    }

    let cerebrasModel = resolveChatModel(requestedModel);
    if (imageUrl) cerebrasModel = "qwen-3.8-27b";

    // ── Cobrança atómica ANTES da chamada ao modelo ───────────────────────
    // Antes, o desconto acontecia no fim do stream: um cliente que desligasse
    // a ligação não era cobrado e dois pedidos paralelos perdiam atualizações.
    let creditCharged = false;
    let creditDegraded = false;

    if (!isGuest && user && plan.planType !== 'premium') {
      const consumed = await consumeCredit(db, user!.id);
      creditCharged = consumed.charged;
      creditDegraded = consumed.degraded;

      if (!consumed.charged && !consumed.degraded) {
        return apiError("insufficient_credits", {
          scope: "[CHAT]",
          message: "Créditos insuficientes. Faça upgrade para continuar.",
        });
      }
    }

    const res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'cerebras-cloud-sdk/typescript/1.0.0',
      },
      body: JSON.stringify({
        model: cerebrasModel,
        messages: openAiMessages,
        stream: true,
        temperature: 0.3,
      }),
    });

    if (!res.ok || !res.body) {
      // Devolver o crédito se o pedido falhou antes de produzir conteúdo.
      if (creditCharged && user) await refundCredit(db, user.id);

      logError("[CHAT] Cerebras respondeu", `${res.status}`);
      return apiError("upstream_unavailable", {
        scope: "[CHAT]",
        message: "O serviço de IA está indisponível. Tente novamente.",
      });
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
              // fragmento SSE parcial — ignorar
            }
          }
        }
      },
      async flush() {
        if (isGuest || !user || !conversationId || conversationId === "guest") return;

        await db.from("messages").insert({
          conversation_id: conversationId,
          role: 'ai',
          content: fullTextAccumulated,
          model_used: requestedModel,
        });

        if (text.trim()) {
          const titleSnippet = text.trim().slice(0, 35) + (text.trim().length > 35 ? "..." : "");
          await db
            .from("conversations")
            .update({ title: titleSnippet, updated_at: new Date().toISOString() })
            .eq("id", conversationId)
            .eq("user_id", user.id)
            .eq("title", "Novo Atendimento");
        }

        // Caminho legado (só quando a migração de segurança ainda não correu):
        // mantém o comportamento antigo para não deixar de cobrar.
        if (creditDegraded && plan.planType !== 'premium') {
          await db
            .from("profiles")
            .update({ credits_balance: Math.max(0, plan.creditsBalance - 1) })
            .eq("id", user.id);
        }
      },
    });

    const headers: Record<string, string> = {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store, no-transform',
      'X-Conversation-Id': conversationId || 'guest',
      'X-Actual-Model': cerebrasModel,
      ...rateLimitHeaders(limit),
    };

    if (setGuestCookie) headers['Set-Cookie'] = setGuestCookie;

    return new Response(res.body.pipeThrough(transformStream), { headers });

  } catch (error: unknown) {
    logError("[CHAT] Erro fatal", error);
    return apiError("internal", { scope: "[CHAT]" });
  }
}
