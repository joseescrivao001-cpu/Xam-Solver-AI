import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

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
(Exemplo: 99%)`;

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado. Faça login para continuar." }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("credits_balance")
      .eq("id", user.id)
      .single();

    if (!profile || profile.credits_balance < 1) {
      return NextResponse.json({ error: "Créditos insuficientes. Adquira mais créditos para continuar." }, { status: 402 });
    }

    const formData = await req.formData();
    const mode = formData.get("mode") as string;
    const text = formData.get("text") as string;
    const file = formData.get("file") as File | null;

    if (!file && !text) {
      return NextResponse.json({ error: "Forneça uma imagem ou texto da questão." }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-pro",
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    const promptParts: (string | { inlineData: { data: string; mimeType: string } })[] = [];
    
    let customPrompt = `O usuário selecionou o modo: MODO ${mode?.toUpperCase()}. \n\n`;
    if (mode === 'prova') customPrompt += "Siga rigorosamente as instruções deste modo: Seja extremamente direto, priorize dar a Resposta Final rapidamente antes das outras seções.\n";
    if (mode === 'estudo') customPrompt += "Siga rigorosamente as instruções deste modo: Seja muito didático na Explicação, ensinando o conceito como se fosse um professor particular.\n";
    if (mode === 'dificil') customPrompt += "Siga rigorosamente as instruções deste modo: Analise profundamente todas as entrelinhas, pegadinhas e exceções antes de responder. Faça deduções avançadas.\n";
    
    if (text) customPrompt += `\nTexto adicional da questão: ${text}`;
    
    promptParts.push(customPrompt);

    if (file) {
      // Validação MIME Type rigorosa
      const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validMimeTypes.includes(file.type)) {
        return NextResponse.json({ error: "Formato de imagem inválido. Use JPG, PNG ou WEBP." }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      promptParts.push({
        inlineData: {
          data: buffer.toString("base64"),
          mimeType: file.type,
        },
      });
    }

    const result = await model.generateContent({
      contents: [{ role: "user", parts: promptParts }],
      generationConfig: {
        temperature: 0.1, // Temperatura baixa (precisão)
      },
    });

    const responseText = result.response.text();

    // Deduzir 1 crédito
    await supabase
      .from("profiles")
      .update({ credits_balance: profile.credits_balance - 1 })
      .eq("id", user.id);

    // Salvar registro (opcionalmente poderíamos fazer upload da imagem pro Supabase Storage aqui)
    await supabase.from("exams").insert({
      user_id: user.id,
      question_text: text || "Imagem enviada",
      mode: mode || "estudo",
      answer_json: { response: responseText }
    });

    return NextResponse.json({ response: responseText });
  } catch (error: unknown) {
    console.error("Solver API Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json({ error: "Erro interno no servidor: " + errorMessage }, { status: 500 });
  }
}
