export const runtime = 'edge';
export const maxDuration = 60; // 60 segundos permitidos no Hobby Vercel

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

    const rawModel = process.env.GEMINI_MODEL;
    const modelToUse = rawModel ? rawModel.trim() : "gemini-3.6-flash";
    const model = genAI.getGenerativeModel({
      model: modelToUse,
      systemInstruction: SYSTEM_INSTRUCTION,
    });

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

      // Uso do Node Buffer polyfill nativo do Edge Next.js (MUITO mais rápido que loop JS)
      const buffer = Buffer.from(await file.arrayBuffer());
      promptParts.push({
        inlineData: {
          data: buffer.toString("base64"),
          mimeType: file.type,
        },
      });
    }

    const result = await model.generateContentStream({
      contents: [{ role: "user", parts: promptParts }],
      generationConfig: {
        temperature: 0.1, 
        maxOutputTokens: 8192,
      },
    });

    const stream = new ReadableStream({
      async start(controller) {
        let fullText = "";
        try {
          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            fullText += chunkText;
            controller.enqueue(new TextEncoder().encode(chunkText));
          }

          // Validação final de formato
          if (!fullText.includes('Resposta') && !fullText.includes('Resposta:')) {
            controller.enqueue(new TextEncoder().encode("\n\n**[SISTEMA]: A IA falhou em formatar a Resposta Final. Crédito NÃO deduzido.**"));
            controller.close();
            return;
          }

          // Salvar histórico e deduzir crédito SOMENTE se tudo deu certo
          const { error: insertError } = await supabase.from("exams").insert({
            user_id: user.id,
            question_text: text || "Imagem enviada",
            mode: mode || "estudo",
            answer_json: { response: fullText }
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
        } catch (err) {
          console.error("Stream generation error:", err);
          controller.error(err);
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
    console.error("Solver API Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
