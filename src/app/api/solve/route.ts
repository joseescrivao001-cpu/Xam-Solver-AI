export const runtime = 'edge';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

import { Buffer } from "node:buffer";
import { createClient } from "@/lib/supabase/server";
import { GoogleGenerativeAI, Part } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);

const SYSTEM_INSTRUCTION = `Você é o "Exam Solver AI", um Especialista Acadêmico supremo de resolução de provas.
Seu objetivo é resolver a questão da imagem ou texto com precisão matemática e lógica impecável (Protocolo Zero Alucinações).

Processo: Analisar Imagem -> Montar Equações/Lógica -> Verificar Alternativas -> Validar Resultado.

Formate sua resposta EXATAMENTE com os seguintes cabeçalhos Markdown:

### [RESPOSTA]
(Sua resposta final e direta. Alternativa correta e texto)

### [EXPLICAÇÃO]
(Seu raciocínio passo a passo detalhado)

### [VERIFICAÇÃO]
(A prova real ou por que as alternativas erradas estão incorretas)

### [CONFIANÇA]
(Exemplo: 100%)

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
    
    let customPrompt = `MODO: ${mode?.toUpperCase() || 'ESTUDO'}. \n`;
    if (text) customPrompt += `\nTexto adicional da questão: ${text}`;
    promptParts.push({ text: customPrompt });
    
    let groqImageUrl = null;

    if (file) {
      const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validMimeTypes.includes(file.type)) {
        return new Response(JSON.stringify({ error: "Formato inválido. Use JPG, PNG ou WEBP." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const base64Data = buffer.toString("base64");
      promptParts.push({
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      });
      groqImageUrl = `data:${file.type};base64,${base64Data}`;
    }

    const stream = new ReadableStream({
      async start(controller) {
        // TTFB Hack
        controller.enqueue(new TextEncoder().encode(" "));

        try {
          const geminiModels = ['gemini-1.5-pro-latest', 'gemini-1.5-flash'];
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
                { apiVersion: 'v1' } // Exigência explícita
              );

              result = await model.generateContentStream({
                contents: [{ role: "user", parts: promptParts }],
                generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
              });
              break; 
            } catch (err: unknown) {
              const errMsg = err instanceof Error ? err.message : String(err);
              if (errMsg.includes('429') || errMsg.includes('Too Many Requests') || errMsg.includes('quota') || errMsg.includes('exhausted') || errMsg.includes('503') || errMsg.includes('404')) {
                console.log(`[Rodízio] ${modelName} falhou, tentando o próximo...`);
                continue;
              }
              throw err;
            }
          }

          if (!result && process.env.GROQ_API_KEY) {
             usedGroq = true;
             console.log("[Rodízio] Tentando Groq Llama 3.3 70B...");
             
             let groqContent = text || "Responda a questão.";
             if (groqImageUrl) {
                groqContent = `[IMAGEM ENVIADA PELO USUÁRIO (NÃO PROCESSADA)]: ${text || 'Descreva a resposta.'}`;
             }

             const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
               method: "POST",
               headers: {
                 "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
                 "Content-Type": "application/json"
               },
               body: JSON.stringify({
                 model: "llama-3.3-70b-versatile",
                 messages: [
                   { role: "system", content: SYSTEM_INSTRUCTION },
                   { role: "user", content: groqContent }
                 ],
                 temperature: 0.1,
                 max_tokens: 8192,
                 stream: true
               })
             });

             if (!groqRes.ok) throw new Error("Groq fallback failed");
             
             const reader = groqRes.body?.getReader();
             const decoder = new TextDecoder();
             if (reader) {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  const chunkStr = decoder.decode(value);
                  const lines = chunkStr.split('\n');
                  for (const line of lines) {
                    if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                      try {
                        const data = JSON.parse(line.slice(6));
                        const content = data.choices[0]?.delta?.content || "";
                        finalResponseText += content;
                        controller.enqueue(new TextEncoder().encode(content));
                      } catch(e) { console.error(e); }
                    }
                  }
                }
             }
          }

          if (!usedGroq && result) {
            for await (const chunk of result.stream) {
              const chunkText = chunk.text();
              finalResponseText += chunkText;
              controller.enqueue(new TextEncoder().encode(chunkText));
            }
          }

          if (!finalResponseText.includes('[RESPOSTA]') && !finalResponseText.includes('RESPOSTA')) {
            controller.enqueue(new TextEncoder().encode("\n\n**[SISTEMA]: A IA falhou em formatar a Resposta Final com a tag [RESPOSTA]. Crédito NÃO deduzido.**"));
            controller.close();
            return;
          }

          const { error: insertError } = await supabase.from("exams").insert({
            user_id: user.id,
            question_text: text || "Imagem enviada",
            mode: mode || "estudo",
            answer_json: { response: finalResponseText }
          });

          if (!insertError) {
            await supabase.from("profiles").update({ credits_balance: profile.credits_balance - 1 }).eq("id", user.id);
          }

          controller.close();
        } catch (err) {
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
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
