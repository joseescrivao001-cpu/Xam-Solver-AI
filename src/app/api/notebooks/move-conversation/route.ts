import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// POST /api/notebooks/move-conversation - Mover conversa para um caderno ou desvincular
export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const body = await req.json();
    const { conversation_id, notebook_id } = body;

    if (!conversation_id) {
      return NextResponse.json({ error: "conversation_id é obrigatório." }, { status: 400 });
    }

    const serviceClient = createServiceClient();
    const db = serviceClient || supabase;

    const { data: updated, error } = await db
      .from("conversations")
      .update({
        notebook_id: notebook_id || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversation_id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("[MOVE_CONV_ERROR]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, conversation: updated });
  } catch (err) {
    console.error("[MOVE_CONV_FATAL]", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
