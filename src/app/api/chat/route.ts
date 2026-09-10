export const runtime = 'edge';

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI, Part, Content } from "@google/generative-ai";

// Supabase client direto (sem cookies) para o Edge Runtime
// Usamos a SERVICE_ROLE_KEY para bypass RLS no backend
function createEdgeSupabase() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);

const SYSTEM_INSTRUCTION = `Você é o "Exam Solver AI", um Especialista Acadêmico supremo de resolução de provas.
Seu objetivo é resolver a questão da imagem ou texto com precisão matemática e lógica impecável (Protocolo Zero Alucinações).
Siga rigorosamente as ETAPAS DE LEITURA E CONFIRMAÇÃO VISUAL para imagens.
Formate sua resposta EXATAMENTE com os seguintes cabeçalhos Markdown:

### Resposta
(Sua resposta final e direta)

### Explicação
(Seu raciocínio passo a passo detalhado)

### Verificação
(A prova real ou por que as alternativas erradas estão incorretas)

### Nível de Confiança
(Exemplo: 99%)

Seja conciso no raciocínio e OBRIGATÓRIO entregar a RESPOSTA FINAL no formato [LETRA] - [TEXTO]. Se você não entregar a resposta final, a tarefa será considerada FALHA.`;

// Helper: converte ArrayBuffer para Base64 sem depender de Node Buffer (compatível com Edge)
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
    // Extrair token do cookie de autenticação do Supabase
    const cookieHeader = req.headers.get("cookie") || "";
    const supabaseAdmin = createEdgeSupabase();

    // Buscar tokens de sessão do cookie
    // O Supabase SSR armazena tokens em cookies como sb-<ref>-auth-token
    let userId: string | null = null;
    
    // Tentar extrair o access_token dos cookies
    const cookies = cookieHeader.split(";").map(c => c.trim());
    let accessToken: string | null = null;
    for (const cookie of cookies) {
      if (cookie.includes("auth-token")) {
        // O cookie pode estar codificado como base64 chunk
        const parts = cookie.split("=");
        if (parts.length >= 2) {
          accessToken = parts.slice(1).join("=");
          break;
        }
      }
    }
    
    // Usar service role para verificar o JWT e obter o user
    if (accessToken) {
      try {
        const decoded = JSON.parse(decodeURIComponent(accessToken));
        if (decoded && decoded.access_token) {
          const { data: { user } } = await supabaseAdmin.auth.getUser(decoded.access_token);
          if (user) userId = user.id;
        }
      } catch {
        // O token pode estar em outro formato, tentar chunked cookies
      }
    }
    
    // Fallback: tentar pegar de chunks (sb-xxx-auth-token.0, .1, etc)
    if (!userId) {
      const chunks: string[] = [];
      for (const cookie of cookies) {
        if (cookie.includes("auth-token")) {
          const eqIdx = cookie.indexOf("=");
          if (eqIdx !== -1) chunks.push(cookie.substring(eqIdx + 1));
        }
      }
      if (chunks.length > 0) {
        try {
          const full = chunks.join("");
          const decoded = JSON.parse(decodeURIComponent(full));
          if (decoded && decoded.access_token) {
            const { data: { user } } = await supabaseAdmin.auth.getUser(decoded.access_token);
            if (user) userId = user.id;
          }
        } catch {
          // Ignore parse errors
        }
      }
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "Não autorizado. Faça login novamente." }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("credits_balance")
      .eq("id", userId)
      .single();

    if (!profile || profile.credits_balance < 1) {
      return new Response(JSON.stringify({ error: "Créditos insuficientes." }), { status: 402, headers: { 'Content-Type': 'application/json' } });
    }

    const formData = await req.formData();
    const conversationId = formData.get("conversation_id") as string;
    const text = formData.get("text") as string;
    const file = formData.get("file") as File | null;

    if (!file && !text) {
      return new Response(JSON.stringify({ error: "Forneça uma imagem ou texto." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (!conversationId) {
       return new Response(JSON.stringify({ error: "conversation_id não fornecido." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // Salvar a mensagem do usuário no banco
    const userMessageContent = text || "Imagem enviada";
    await supabaseAdmin.from("messages").insert({
      conversation_id: conversationId,
      role: 'user',
      content: userMessageContent
    });

    // Buscar histórico do chat para contexto
    const { data: historyData } = await supabaseAdmin
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    // Converter para formato do Gemini (pular a última = prompt atual)
    let chatHistory: Content[] = [];
    if (historyData && historyData.length > 1) {
       const previousMsgs = historyData.slice(0, -1);
       chatHistory = previousMsgs.map(m => ({
          role: m.role === 'ai' ? 'model' : 'user',
          parts: [{ text: m.content }]
       }));
    }

    const promptParts: Part[] = [];
    if (text) promptParts.push({ text: `Pergunta atual do usuário: ${text}` });

    if (file) {
      const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validMimeTypes.includes(file.type)) {
        return new Response(JSON.stringify({ error: "Formato inválido. Use JPG, PNG ou WEBP." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      const base64Data = arrayBufferToBase64(await file.arrayBuffer());
      promptParts.push({
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      });
    }

    const stream = new ReadableStream({
      async start(controller) {
        // TTFB Hack: envia espaço invisível para resetar o timer da Vercel
        controller.enqueue(new TextEncoder().encode(" "));

        try {
          const model = genAI.getGenerativeModel(
            {
              model: 'gemini-3.6-flash',
              systemInstruction: SYSTEM_INSTRUCTION,
            },
            { apiVersion: 'v1beta' }
          );

          let result;
          if (chatHistory.length > 0) {
             const chat = model.startChat({
               history: chatHistory,
               generationConfig: {
                 temperature: 0.1, 
                 maxOutputTokens: 8192,
               }
             });
             result = await chat.sendMessageStream(promptParts);
          } else {
             result = await model.generateContentStream({
                contents: [{ role: "user", parts: promptParts }],
                generationConfig: {
                  temperature: 0.1, 
                  maxOutputTokens: 8192,
                },
             });
          }

          let finalResponseText = "";
          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            finalResponseText += chunkText;
            controller.enqueue(new TextEncoder().encode(chunkText));
          }

          // Validação apenas na primeira mensagem (exigir "Resposta" no formato)
          if (chatHistory.length === 0 && !finalResponseText.includes('Resposta') && !finalResponseText.includes('Resposta:')) {
            controller.enqueue(new TextEncoder().encode("\n\n**[SISTEMA]: A IA falhou em formatar a Resposta Final. Crédito NÃO deduzido.**"));
            controller.close();
            return;
          }

          // Salvar resposta da IA no banco
          const { error: insertError } = await supabaseAdmin.from("messages").insert({
            conversation_id: conversationId,
            role: 'ai',
            content: finalResponseText
          });

          // Debitar crédito somente se salvou com sucesso
          if (!insertError) {
            await supabaseAdmin
              .from("profiles")
              .update({ credits_balance: profile.credits_balance - 1 })
              .eq("id", userId);
          } else {
             console.error("Erro ao inserir mensagem da IA no Supabase:", insertError);
          }

          controller.close();
        } catch (err) {
          console.error("Stream generation error:", err);
          const errorMsg = err instanceof Error ? err.message : String(err);
          controller.enqueue(new TextEncoder().encode(`\n\n**[FALHA NA INTELIGÊNCIA ARTIFICIAL]:** ${errorMsg}\n\n*Nenhum crédito foi cobrado.*`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked'
      }
    });
  } catch (error: unknown) {
    console.error("Chat API Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
