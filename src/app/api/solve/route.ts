export const runtime = 'edge';

import { Buffer } from "node:buffer";
import { createClient } from "@/lib/supabase/server";
import { GoogleGenerativeAI, Part } from "@google/generative-ai";

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

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: "Não autorizado." }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("credits_balance")
      .eq("id", user.id)
      .single();

    if (!profile || profile.credits_balance < 1) {
      return new Response(JSON.stringify({ error: "Créditos insuficientes." }), { status: 402, headers: { 'Content-Type': 'application/json' } });
    }

    const formData = await req.formData();
    const mode = formData.get("mode") as string;
    const text = formData.get("text") as string;
    const file = formData.get("file") as File | null;

    if (!file && !text) {
      return new Response(JSON.stringify({ error: "Forneça uma imagem ou texto." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const promptParts: Part[] = [];
    
    let customPrompt = `MODO: ${mode?.toUpperCase()}. \n`;
    if (mode === 'prova') customPrompt += "Seja extremamente direto na Resposta Final.\n";
    if (mode === 'estudo') customPrompt += "Seja muito didático na Explicação.\n";
    if (mode === 'dificil') customPrompt += "Analise profundamente todas as entrelinhas e pegadinhas.\n";
    
    if (text) customPrompt += `\nTexto adicional da questão: ${text}`;
    promptParts.push({ text: customPrompt });

    if (file) {
      const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validMimeTypes.includes(file.type)) {
        return new Response(JSON.stringify({ error: "Formato inválido. Use JPG, PNG ou WEBP." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      promptParts.push({
        inlineData: {
          data: buffer.toString("base64"),
          mimeType: file.type,
        },
      });
    }

    const stream = new ReadableStream({
      async start(controller) {
        // Envia um espaço invisível IMEDIATAMENTE para forçar o Vercel a reconhecer o TTFB (Time To First Byte)
        controller.enqueue(new TextEncoder().encode(" "));

        const modelsToTry: string[] = [];
        if (process.env.GEMINI_MODEL) {
          modelsToTry.push(process.env.GEMINI_MODEL.trim());
        }
        modelsToTry.push("gemini-1.5-pro-latest", "gemini-1.5-flash", "gemini-pro");
        
        // Remove duplicates maintaining order
        const uniqueModels = Array.from(new Set(modelsToTry));

        let success = false;
        let finalResponseText = "";
        let lastErrorMsg = "";

        for (const modelName of uniqueModels) {
          const model = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction: SYSTEM_INSTRUCTION,
          });

          let attempts = 0;

          while (attempts < 3) {
            try {
              attempts++;
              const result = await model.generateContentStream({
                contents: [{ role: "user", parts: promptParts }],
                generationConfig: {
                  temperature: 0.1, 
                  maxOutputTokens: 8192,
                },
              });

              for await (const chunk of result.stream) {
                const chunkText = chunk.text();
                finalResponseText += chunkText;
                controller.enqueue(new TextEncoder().encode(chunkText));
              }

              success = true;
              break; // Sai do loop de tentativas se foi bem sucedido
            } catch (err: any) {
              const errMsg = err.message || String(err);
              lastErrorMsg = errMsg;
              
              if (errMsg.includes("503") || errMsg.includes("429")) {
                if (attempts < 3) {
                  // Aguarda 2 segundos antes de tentar novamente (Retry Logic)
                  await new Promise(resolve => setTimeout(resolve, 2000));
                  continue; // Tenta o MESMO modelo novamente
                }
              }
              // Se foi 404, erro de permissão ou esgotou tentativas, sai do loop de tentativas para testar o PRÓXIMO modelo
              break;
            }
          }

          if (success) {
            break; // Sai do loop de modelos se resolveu com sucesso
          }
        }

        if (!success) {
          controller.enqueue(new TextEncoder().encode(`\n\n**[FALHA NA INTELIGÊNCIA ARTIFICIAL]:** Esgotamos todas as tentativas e lista de modelos de fallback. Último erro recebido: ${lastErrorMsg}\n\n*Nenhum crédito foi cobrado.*`));
          controller.close();
          return;
        }

        // Validação Final: Verifica se cumpriu as ordens
        if (!finalResponseText.includes('Resposta') && !finalResponseText.includes('Resposta:')) {
          controller.enqueue(new TextEncoder().encode("\n\n**[SISTEMA]: A IA falhou em formatar a Resposta Final. Crédito NÃO deduzido.**"));
          controller.close();
          return;
        }

        // Cobrança e Histórico SOMENTE APÓS TODAS as etapas terem sucesso
        const { error: insertError } = await supabase.from("exams").insert({
          user_id: user.id,
          question_text: text || "Imagem enviada",
          mode: mode || "estudo",
          answer_json: { response: finalResponseText }
        });

        if (!insertError) {
          await supabase
            .from("profiles")
            .update({ credits_balance: profile.credits_balance - 1 })
            .eq("id", user.id);
        } else {
           console.error("Erro ao inserir no Supabase:", insertError);
        }

        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked'
      }
    });
  } catch (error: unknown) {
    console.error("Solver API Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
