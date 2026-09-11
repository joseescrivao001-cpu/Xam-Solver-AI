export const runtime = 'edge';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

import { createClient } from "@/lib/supabase/server";
import { GoogleGenerativeAI, Part, Content } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);

const SYSTEM_INSTRUCTION = `Você é o "Exam Solver AI", um Especialista Acadêmico supremo de resolução de provas e tutor de estudos.
Seu objetivo é resolver questões de provas, vestibulares, concursos e exercícios acadêmicos com precisão matemática impecável (Protocolo Zero Alucinações).

SOBRE O SEU CRIADOR (IMPORTANTE):
- Criador: José Escrivão Silvestre (Nascido em 25/01/2002 em Luanda, Angola)
- Contato: joseescrivao.silvestre@gmail.com | +244 930 339 436
- Perfil: Estudante de Engenharia Informática no ISPK (2º Ano), Técnico Médio de Informática pela ETESAL.
- Atuação: Técnico e Gerente de TI na PANDA TECH (2024-Presente).
Sempre que falar dele, demonstre profundo respeito e orgulho da sua autoria.

MODO DE OPERAÇÃO:
1. Para Questões de Provas, Exercícios ou Imagens de Exames:
- Processo: Analisar Imagem/Texto -> Montar Equações/Lógica -> Verificar Alternativas -> Validar Resultado.
- Use LaTeX puro envolvendo fórmulas com cifrão duplo para blocos ($$ ... $$) ou cifrão simples para linha ($ ... $).
- Formate a resposta exatamente com os seguintes tópicos:

### [RESPOSTA]
(Sua resposta final e direta. No formato [LETRA] - [TEXTO] quando for de múltipla escolha)

### [EXPLICAÇÃO]
(Seu raciocínio passo a passo detalhado)

### [VERIFICAÇÃO]
(A prova real ou justificativa de por que as demais alternativas estão incorretas)

### [CONFIANÇA]
(Exemplo: 100%)

2. Para Saudações ("oi", "olá"), Dúvidas sobre o Sistema ou Conversas Gerais:
- Responda cordialmente em tom profissional e acolhedor.
- Apresente-se como o Exam Solver AI e convide o estudante a enviar a foto ou texto da questão que deseja resolver.`;

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
    const { data: { user } } = await supabase.auth.getUser();
    
    const isGuest = !user;
    let profile = null;

    if (!isGuest) {
      const { data: p } = await supabase
        .from("profiles")
        .select("credits_balance")
        .eq("id", user?.id)
        .single();
      profile = p;

      if (!profile || profile.credits_balance < 1) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), { status: 402, headers: { 'Content-Type': 'application/json' } });
      }
    }

    const formData = await req.formData();
    const conversationId = formData.get("conversation_id") as string;
    const text = formData.get("text") as string;
    const file = formData.get("file") as File | null;

    if (!file && !text) {
      return new Response(JSON.stringify({ error: "Forneça uma imagem ou texto." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const userMessageContent = text || "Imagem enviada";
    let imageUrl: string | null = null;
    let groqImageUrl: string | null = null;
    const promptParts: Part[] = [];

    if (file) {
      const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validMimeTypes.includes(file.type)) {
        return new Response(JSON.stringify({ error: "Formato inválido. Use JPG, PNG ou WEBP." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      const base64Data = arrayBufferToBase64(await file.arrayBuffer());
      imageUrl = `data:${file.type};base64,${base64Data}`;
      groqImageUrl = imageUrl;
      promptParts.push({
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      });
    }

    if (text) promptParts.push({ text: `Pergunta atual do usuário: ${text}` });
    
    if (!isGuest && conversationId && conversationId !== "guest") {
      const { error: insertErr } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        role: 'user',
        content: userMessageContent,
        image_url: imageUrl
      });
      if (insertErr) {
        await supabase.from("messages").insert({
          conversation_id: conversationId,
          role: 'user',
          content: userMessageContent
        });
      }

      if (imageUrl && user) {
        await supabase.from("exams").insert({
          user_id: user.id,
          image_url: imageUrl,
          question_text: text || "Resolução de imagem",
          mode: 'estudo'
        });
      }
    }

    let chatHistory: Content[] = [];
    if (!isGuest && conversationId && conversationId !== "guest") {
      const { data: historyData } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (historyData && historyData.length > 1) {
        // Exclui a mensagem recém-adicionada
        const previousMsgs = historyData.slice(0, -1);
        
        // Higienizar histórico: alternar estritamente entre user e model
        const sanitized: Content[] = [];
        for (const m of previousMsgs) {
          const role: 'user' | 'model' = m.role === 'ai' ? 'model' : 'user';
          if (!m.content || !m.content.trim()) continue;

          if (sanitized.length > 0 && sanitized[sanitized.length - 1].role === role) {
            sanitized[sanitized.length - 1].parts[0].text += `\n${m.content}`;
          } else {
            sanitized.push({
              role,
              parts: [{ text: m.content }]
            });
          }
        }

        // O histórico do Gemini deve começar com 'user' e terminar com 'model'
        while (sanitized.length > 0 && sanitized[0].role !== 'user') {
          sanitized.shift();
        }
        while (sanitized.length > 0 && sanitized[sanitized.length - 1].role !== 'model') {
          sanitized.pop();
        }

        chatHistory = sanitized;
      }
    }

    const stream = new ReadableStream({
      async start(controller) {
        // TTFB Hack: envia espaço invisível para resetar o timer da Vercel
        controller.enqueue(new TextEncoder().encode(" "));

        try {
          const geminiModels = ['gemini-1.5-flash', 'gemini-1.5-pro'];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let result: any = null;
          let finalResponseText = "";
          let usedGroq = false;
          
          for (const modelName of geminiModels) {
            try {
              const model = genAI.getGenerativeModel(
                {
                  model: modelName,
                  systemInstruction: SYSTEM_INSTRUCTION,
                },
                { apiVersion: 'v1' }
              );

              if (chatHistory.length > 0) {
                const chat = model.startChat({
                  history: chatHistory,
                  generationConfig: { temperature: 0.2, maxOutputTokens: 8192 }
                });
                result = await chat.sendMessageStream(promptParts);
              } else {
                result = await model.generateContentStream({
                  contents: [{ role: "user", parts: promptParts }],
                  generationConfig: { temperature: 0.2, maxOutputTokens: 8192 },
                });
              }
              break; // Sucesso com Gemini
            } catch (err: unknown) {
              const errMsg = err instanceof Error ? err.message : String(err);
              console.log(`[Rodízio] ${modelName} falhou: ${errMsg}. Tentando próximo...`);
              continue;
            }
          }

          // Groq Fallback se Gemini não estiver disponível
          if (!result && process.env.GROQ_API_KEY) {
             usedGroq = true;
             console.warn("[FAILOVER] Tier 1 e 2 do Google falharam. Usando GROQ como Tier Nuclear.");
             
             // eslint-disable-next-line @typescript-eslint/no-explicit-any
             const groqMessages: any[] = [
               { role: "system", content: SYSTEM_INSTRUCTION }
             ];
             
             for (const h of chatHistory) {
               groqMessages.push({
                 role: h.role === 'model' ? 'assistant' : 'user',
                 content: h.parts[0].text
               });
             }
             
             let groqContent = text || "Responda a questão.";
             if (groqImageUrl) {
                groqContent = `[IMAGEM ENVIADA PELO USUÁRIO (NÃO PROCESSADA NO FALLBACK GROQ)]: ${text || 'Por favor, descreva os detalhes da questão para resolução.'}`;
             }

             groqMessages.push({
               role: "user",
               content: groqContent
             });

             const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
               method: "POST",
               headers: {
                 "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
                 "Content-Type": "application/json"
               },
               body: JSON.stringify({
                 model: "openai/gpt-oss-120b",
                 messages: groqMessages,
                 temperature: 0.2,
                 max_tokens: 8192,
                 stream: true
               })
             });

             if (!groqRes.ok) {
                throw new Error("Groq fallback failed: " + await groqRes.text());
             }
             
             const reader = groqRes.body?.getReader();
             const decoder = new TextDecoder("utf-8");
             if (reader) {
                let sseBuffer = "";
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  sseBuffer += decoder.decode(value, { stream: true });
                  const lines = sseBuffer.split('\n');
                  // Preservar a última linha incompleta no buffer!
                  sseBuffer = lines.pop() || "";
                  
                  for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]') {
                      try {
                        const data = JSON.parse(trimmed.slice(6));
                        const content = data.choices?.[0]?.delta?.content || "";
                        if (content) {
                          finalResponseText += content;
                          controller.enqueue(new TextEncoder().encode(content));
                        }
                      } catch (e) {
                         console.error("SSE parse error:", e);
                      }
                    }
                  }
                }
             }
          } else if (!result && !process.env.GROQ_API_KEY) {
            controller.enqueue(new TextEncoder().encode("\n\n**[SISTEMA]: Nossos servidores de IA estão com alta demanda. Por favor, aguarde alguns segundos e tente novamente.**\n\n*Nenhum crédito foi cobrado.*"));
            controller.close();
            return;
          }

          if (!usedGroq && result) {
            for await (const chunk of result.stream) {
              const chunkText = chunk.text();
              finalResponseText += chunkText;
              controller.enqueue(new TextEncoder().encode(chunkText));
            }
          }

          // Validação de entrega útil
          if (!finalResponseText || finalResponseText.trim().length < 5) {
            controller.enqueue(new TextEncoder().encode("\n\n**[SISTEMA]: A IA não gerou uma resposta válida. Crédito NÃO deduzido.**"));
            controller.close();
            return;
          }

          // Salvar no banco e debitar crédito
          if (!isGuest && conversationId && conversationId !== "guest" && profile) {
            const { error: insertError } = await supabase.from("messages").insert({
              conversation_id: conversationId,
              role: 'ai',
              content: finalResponseText
            });

            if (!insertError) {
              await supabase
                .from("profiles")
                .update({ credits_balance: profile.credits_balance - 1 })
                .eq("id", user!.id);
            }
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
