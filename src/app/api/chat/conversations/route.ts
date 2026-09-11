import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET /api/chat/conversations - Listar conversas do usuário autenticado
export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ conversations: [] });
    }

    const serviceClient = createServiceClient();
    const db = serviceClient || supabase;

    const { data: conversations, error } = await db
      .from("conversations")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[CONVERSATIONS_GET_ERROR]", error);
      return NextResponse.json({ conversations: [] });
    }

    return NextResponse.json({ conversations: conversations || [] });
  } catch (err) {
    console.error("[CONVERSATIONS_GET_FATAL]", err);
    return NextResponse.json({ conversations: [] });
  }
}

// POST /api/chat/conversations - Criar nova conversa
export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const title = (body.title || "Novo Atendimento").slice(0, 100);

    const serviceClient = createServiceClient();
    const db = serviceClient || supabase;

    const { data: newConv, error } = await db
      .from("conversations")
      .insert({
        user_id: user.id,
        title: title.trim() || "Novo Atendimento",
      })
      .select()
      .single();

    if (error) {
      console.error("[CONVERSATION_CREATE_ERROR]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ conversation: newConv });
  } catch (err) {
    console.error("[CONVERSATION_CREATE_FATAL]", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

// PATCH /api/chat/conversations - Renomear conversa
export async function PATCH(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const { id, title } = await req.json();
    if (!id || !title?.trim()) {
      return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
    }

    const serviceClient = createServiceClient();
    const db = serviceClient || supabase;

    const { data: updated, error } = await db
      .from("conversations")
      .update({ title: title.trim().slice(0, 100) })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ conversation: updated });
  } catch {
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

// DELETE /api/chat/conversations?id=... - Deletar conversa
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
      return NextResponse.json({ error: "ID obrigatório." }, { status: 400 });
    }

    const serviceClient = createServiceClient();
    const db = serviceClient || supabase;

    // Deletar mensagens primeiro (caso ON DELETE CASCADE não esteja configurado no Supabase)
    await db.from("messages").delete().eq("conversation_id", id);

    const { error } = await db
      .from("conversations")
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
