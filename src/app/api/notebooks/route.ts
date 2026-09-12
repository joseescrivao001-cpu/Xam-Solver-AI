import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET /api/notebooks - Listar todos os cadernos com contadores
export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ notebooks: [] });
    }

    const serviceClient = createServiceClient();
    const db = serviceClient || supabase;

    // Buscar cadernos do usuário
    const { data: notebooks, error } = await db
      .from("notebooks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[NOTEBOOKS_GET_ERROR]", error);
      return NextResponse.json({ notebooks: [] });
    }

    // Se não existirem cadernos, criar os 4 cadernos padrão automaticamente
    if (!notebooks || notebooks.length === 0) {
      const defaults = [
        { user_id: user.id, name: "Física & Mecânica", color: "indigo", description: "Mecânica clássica, óptica, termodinâmica e eletromagnetismo" },
        { user_id: user.id, name: "Cálculo & Matemática", color: "emerald", description: "Derivadas, integrais, matrizes, álgebra e geometria" },
        { user_id: user.id, name: "Química Orgânica", color: "amber", description: "Reações químicas, tabela periódica e estequiometria" },
        { user_id: user.id, name: "Biologia & Saúde", color: "rose", description: "Genética, citologia, fisiologia humana e ecologia" },
      ];

      const { data: createdDefaults } = await db
        .from("notebooks")
        .insert(defaults)
        .select();

      return NextResponse.json({ notebooks: createdDefaults || [] });
    }

    return NextResponse.json({ notebooks });
  } catch (err) {
    console.error("[NOTEBOOKS_GET_FATAL]", err);
    return NextResponse.json({ notebooks: [] });
  }
}

// POST /api/notebooks - Criar novo caderno
export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const body = await req.json();
    const { name, color, description } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Nome do caderno é obrigatório." }, { status: 400 });
    }

    const serviceClient = createServiceClient();
    const db = serviceClient || supabase;

    const { data: notebook, error } = await db
      .from("notebooks")
      .insert({
        user_id: user.id,
        name: name.trim().slice(0, 100),
        color: color || "indigo",
        description: description?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ notebook });
  } catch {
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

// PATCH /api/notebooks - Atualizar nome ou cor
export async function PATCH(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const body = await req.json();
    const { id, name, color, description } = body;

    if (!id) {
      return NextResponse.json({ error: "ID obrigatório." }, { status: 400 });
    }

    const serviceClient = createServiceClient();
    const db = serviceClient || supabase;

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (name) updates.name = name.trim().slice(0, 100);
    if (color) updates.color = color;
    if (description !== undefined) updates.description = description?.trim();

    const { data: updated, error } = await db
      .from("notebooks")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ notebook: updated });
  } catch {
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

// DELETE /api/notebooks?id=... - Excluir caderno
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

    // Desvincular conversas associadas
    await db.from("conversations").update({ notebook_id: null }).eq("notebook_id", id);
    // Deletar materiais e notas associadas
    await db.from("notebook_materials").delete().eq("notebook_id", id);
    await db.from("notebook_notes").delete().eq("notebook_id", id);
    await db.from("notebook_analytics").delete().eq("notebook_id", id);

    const { error } = await db
      .from("notebooks")
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
