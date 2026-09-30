export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

import { createClient, createServiceClient } from "@/lib/supabase/server";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function getApiKey(): string {
  const key = process.env.CEREBRAS_API_KEY;
  return key && typeof key === 'string' ? key.trim() : '';
}

const SYSTEM_INSTRUCTION = `Você é o Exam Solver AI, especialista em resolução de provas e questões acadêmicas STEM.

### 🌍 IDIOMA OBRIGATÓRIO
SEMPRE responda em Português Brasileiro. Nunca use outro idioma.

### 🖼️ PROCESSAMENTO DE IMAGENS E PDFs
Quando uma imagem ou PDF for enviado, analise completamente o conteúdo.

### 📏 FORMATAÇÃO KaTeX
- Fórmulas inline: $formula$
- Equações em bloco: $$formula$$

### ✍️ ESTRUTURA DA RESPOSTA
### [RESPOSTA]
(Sua resposta final e direta)

### [EXPLICAÇÃO]
(Raciocínio passo a passo detalhado)

### [VERIFICAÇÃO]
(Prova do resultado ou por que alternativas erradas estão incorretas)

### [CONFIANÇA]
(Ex: 95%)`;

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: "Não autorizado." }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const serviceClient = createServiceClient();
    const db = serviceClient || supabase;

    const { data: profile } = await db
      .from("profiles")
      .select("credits_balance, plan_type")
      .eq("id", user.id)
      .single();

    const userPlan = profile?.plan_type || 'free';

    if (userPlan !== 'premium' && (!profile || profile.credits_balance < 1)) {
      return new Response(JSON.stringify({ error: "Créditos insuficientes. Faça upgrade para continuar." }), { status: 402, headers: { 'Content-Type': 'application/json' } });
    }

    const formData = await req.formData();
    const mode = formData.get("mode") as string;
    const text = formData.get("text") as string;
    const file = formData.get("file") as File | null;

    if ((mode === 'dificil' || mode === 'pro') && userPlan !== 'ultra' && userPlan !== 'premium') {
      return new Response(JSON.stringify({
        error: "UPGRADE_REQUIRED",
        message: "O modo Difícil é exclusivo dos planos Ultra e Premium."
      }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    if (!file && !text) {
      return new Response(JSON.stringify({ error: "Forneça uma imagem ou texto." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const apiKey = getApiKey();
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Configuração do servidor incompleta." }), { status: 503, headers: { 'Content-Type': 'application/json' } });
    }

    let imageUrl: string | null = null;
    let isPdf = false;
    let pdfExtractedText: string | null = null;
    let fileBuffer: ArrayBuffer | null = null;

    if (file) {
      const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      if (!validMimeTypes.includes(file.type)) {
        return new Response(JSON.stringify({ error: "Formato inválido. Use JPG, PNG, WEBP ou PDF." }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      fileBuffer = await file.arrayBuffer();
      const base64Data = arrayBufferToBase64(fileBuffer);
      imageUrl = `data:${file.type};base64,${base64Data}`;
      isPdf = file.type === 'application/pdf';
      if (isPdf) {
        try {
          const pdfData = await pdfParse(Buffer.from(fileBuffer));
          pdfExtractedText = pdfData.text;
        } catch { pdfExtractedText = "Erro ao ler PDF"; }
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages: any[] = [
      { role: 'system', content: SYSTEM_INSTRUCTION }
    ];

    let modePrefix = `MODO: ${mode?.toUpperCase() || 'ESTUDO'}.\n`;
    if (text) modePrefix += `\nQuestão: ${text}`;

    if (imageUrl && !isPdf) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: modePrefix },
          { type: 'image_url', image_url: { url: imageUrl } }
        ]
      });
    } else {
      const pdfNote = isPdf ? `[CONTEÚDO DO PDF EXTRAÍDO]:\n${pdfExtractedText}\n\n` : '';
    messages.push({ role: 'user', content: `${pdfNote}${modePrefix}` });
    }

    const cerebrasModel = (imageUrl && !isPdf) ? 'qwen-3.8-27b' : 'gpt-oss-120b';

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
        messages,
        stream: true,
        temperature: 0.2
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[SOLVE] Cerebras Error:", errText);
      return new Response(JSON.stringify({ error: "Erro na IA. Tente novamente." }), { status: 503, headers: { 'Content-Type': 'application/json' } });
    }

    if (!res.body) {
      return new Response(JSON.stringify({ error: "Corpo de resposta vazio." }), { status: 503, headers: { 'Content-Type': 'application/json' } });
    }

    let fullText = "";
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
                fullText += delta;
                controller.enqueue(new TextEncoder().encode(delta));
              }
            } catch { /* fragmento parcial */ }
          }
        }
      },
      async flush() {
        if (fullText.trim().length > 5 && profile) {
          const { error: examErr } = await db.from("exams").insert({
            user_id: user.id,
            question_text: text || "Arquivo enviado",
            mode: mode || "estudo",
            answer_json: { response: fullText }
          });
          if (examErr) console.warn("[SOLVE] Erro ao salvar exam:", examErr);

          if (userPlan !== 'premium') {
            const { error: creditErr } = await db
              .from("profiles")
              .update({ credits_balance: Math.max(0, profile.credits_balance - 1) })
              .eq("id", user.id);
            if (creditErr) console.warn("[SOLVE] Erro ao deduzir crédito:", creditErr);
          }
        }
      }
    });

    return new Response(res.body.pipeThrough(transformStream), {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked'
      }
    });

  } catch (error: unknown) {
    console.error("[SOLVE] Fatal Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
