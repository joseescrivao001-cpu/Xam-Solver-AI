import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET /api/notebooks/materials?notebook_id=... - Listar materiais do caderno
export async function GET(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ materials: [] });
    }

    const url = new URL(req.url);
    const notebookId = url.searchParams.get("notebook_id");

    if (!notebookId) {
      return NextResponse.json({ materials: [] });
    }

    const serviceClient = createServiceClient();
    const db = serviceClient || supabase;

    const { data: materials, error } = await db
      .from("notebook_materials")
      .select("*")
      .eq("notebook_id", notebookId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[MATERIALS_GET_ERROR]", error);
      return NextResponse.json({ materials: [] });
    }

    return NextResponse.json({ materials: materials || [] });
  } catch (err) {
    console.error("[MATERIALS_GET_FATAL]", err);
    return NextResponse.json({ materials: [] });
  }
}

// POST /api/notebooks/materials - Adicionar novo material ao caderno
export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const body = await req.json();
    const { notebook_id, title, file_url, file_type, file_size, extracted_text } = body;

    if (!notebook_id || !title?.trim() || !file_url) {
      return NextResponse.json({ error: "notebook_id, title e file_url são obrigatórios." }, { status: 400 });
    }

    const serviceClient = createServiceClient();
    const db = serviceClient || supabase;

    
    let finalExtractedText = extracted_text?.trim() || null;
    
    // OCR VIS�O AVAN�ADA (Para Imagens ou PDFs renderizados no cliente)
    if (file_url && file_url.startsWith("data:image/") && !finalExtractedText) {
      try {
        const apiKey = process.env.CEREBRAS_API_KEY;
        if (apiKey) {
          const ocrRes = await fetch("https://api.cerebras.ai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${apiKey.trim()}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: "qwen-3.8-27b",
              messages: [
                {
                  role: "user",
                  content: [
                    { type: "text", text: "Voc� � um extrator de OCR cir�rgico. Extraia absolutamente todo o texto, tabelas, f�rmulas matem�ticas e equa��es presentes nesta imagem. Mantenha a estrutura original, transcreva gr�ficos e preserve matrizes matematicamente corretas." },
                    { type: "image_url", image_url: { url: file_url } }
                  ]
                }
              ],
              stream: false,
              temperature: 0.1
            })
          });
          
          if (ocrRes.ok) {
            const ocrJson = await ocrRes.json();
            const text = ocrJson.choices?.[0]?.message?.content?.trim();
            if (text && text.length > 5) {
              finalExtractedText = text;
            }
          } else {
             console.error("[OCR_ERROR]", await ocrRes.text());
          }
        }
      } catch (err) {
        console.error("[OCR_FATAL]", err);
      }
    }
    
    const { data: material, error } = await db
      .from("notebook_materials")
      .insert({
        notebook_id,
        user_id: user.id,
        title: title.trim().slice(0, 150),
        file_url,
        file_type: file_type || "document",
        file_size: file_size || 0,
        extracted_text: finalExtractedText,
      })

      .select()
      .single();

    if (error) {
      console.error("[MATERIAL_CREATE_ERROR]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ material });
  } catch (err) {
    console.error("[MATERIAL_CREATE_FATAL]", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

// DELETE /api/notebooks/materials?id=... - Excluir material
export async function DELETE(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID do material obrigatório." }, { status: 400 });
    }

    const serviceClient = createServiceClient();
    const db = serviceClient || supabase;

    const { error } = await db
      .from("notebook_materials")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
