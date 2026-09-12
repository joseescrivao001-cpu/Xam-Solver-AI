import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET /api/notebooks/notes?notebook_id=... - Listar notas do caderno
export async function GET(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ notes: [] });
    }

    const url = new URL(req.url);
    const notebookId = url.searchParams.get("notebook_id");

    if (!notebookId) {
      return NextResponse.json({ notes: [] });
    }

    const serviceClient = createServiceClient();
    const db = serviceClient || supabase;

    const { data: notes, error } = await db
      .from("notebook_notes")
      .select("*")
      .eq("notebook_id", notebookId)
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("[NOTES_GET_ERROR]", error);
      return NextResponse.json({ notes: [] });
    }

    return NextResponse.json({ notes: notes || [] });
  } catch (err) {
    console.error("[NOTES_GET_FATAL]", err);
    return NextResponse.json({ notes: [] });
  }
}

// POST /api/notebooks/notes - Criar ou salvar nota (auto-save)
export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const body = await req.json();
    const { id, notebook_id, title, content } = body;

    if (!notebook_id) {
      return NextResponse.json({ error: "notebook_id obrigatório." }, { status: 400 });
    }

    const serviceClient = createServiceClient();
    const db = serviceClient || supabase;

    if (id) {
      // Atualizar nota existente
      const { data: updated, error } = await db
        .from("notebook_notes")
        .update({
          title: (title || "Minha Anotação").trim().slice(0, 100),
          content: content || "",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ note: updated });
    } else {
      // Criar nova nota
      const { data: created, error } = await db
        .from("notebook_notes")
        .insert({
          notebook_id,
          user_id: user.id,
          title: (title || "Nova Anotação").trim().slice(0, 100),
          content: content || "",
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ note: created });
    }
  } catch (err) {
    console.error("[NOTE_SAVE_FATAL]", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

// DELETE /api/notebooks/notes?id=... - Excluir nota
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

    const { error } = await db
      .from("notebook_notes")
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
