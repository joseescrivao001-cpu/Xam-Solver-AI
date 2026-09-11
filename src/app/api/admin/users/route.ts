import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { verifyAdmin, unauthorizedResponse, isSuperAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = await verifyAdmin();
    if (!auth.isAdmin) {
      return unauthorizedResponse(auth.error);
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const plan = searchParams.get("plan") || "all";
    const status = searchParams.get("status") || "all";
    const role = searchParams.get("role") || "all";

    const serviceClient = createServiceClient();
    const supabase = serviceClient || createClient();

    let query = supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (role === "students") {
      query = query.or("is_admin.is.null,is_admin.eq.false");
    } else if (role === "staff") {
      query = query.eq("is_admin", true);
    }

    if (plan !== "all") {
      query = query.eq("plan_type", plan);
    }

    if (status === "banned") {
      query = query.eq("is_banned", true);
    } else if (status === "active") {
      query = query.or("is_banned.is.null,is_banned.eq.false");
    }

    if (search.trim()) {
      query = query.or(`id.ilike.%${search}%,email.ilike.%${search}%,full_name.ilike.%${search}%`);
    }

    const { data: users, error } = await query;
    if (error) throw error;

    return NextResponse.json({ users: users || [] });
  } catch (err) {
    console.error("[ADMIN_USERS_GET_ERROR]", err);
    return unauthorizedResponse();
  }
}

export async function POST(request: Request) {
  try {
    const auth = await verifyAdmin();
    if (!auth.isAdmin) {
      return unauthorizedResponse(auth.error);
    }

    const body = await request.json();
    const { user_id, action, value } = body;

    if (!user_id || !action) {
      return NextResponse.json({ error: "user_id e action são obrigatórios." }, { status: 400 });
    }

    // Trava de Segurança: Apenas quem possuir o UUID Estático ADMIN_USER_ID pode alterar is_admin
    if (action === "toggle_admin" && !isSuperAdmin(auth.userId)) {
      return unauthorizedResponse("Apenas o Super Administrador pode conceder privilégios.");
    }

    const serviceClient = createServiceClient();
    const supabase = serviceClient || createClient();
    const updatePayload: Record<string, unknown> = {};

    switch (action) {
      case "update_credits":
        const newCredits = parseInt(value, 10);
        if (isNaN(newCredits) || newCredits < 0) {
          return NextResponse.json({ error: "Valor de créditos inválido." }, { status: 400 });
        }
        updatePayload.credits_balance = newCredits;
        break;

      case "update_plan":
        if (!["free", "pro", "ultra", "premium"].includes(value)) {
          return NextResponse.json({ error: "Plano inválido." }, { status: 400 });
        }
        updatePayload.plan_type = value;
        break;

      case "toggle_ban":
        updatePayload.is_banned = Boolean(value);
        break;

      case "toggle_admin":
        updatePayload.is_admin = Boolean(value);
        break;

      default:
        return NextResponse.json({ error: "Ação não reconhecida." }, { status: 400 });
    }

    const { data: updated, error } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", user_id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      user: updated,
      message: "Perfil de usuário atualizado com sucesso!"
    });
  } catch (err) {
    console.error("[ADMIN_USERS_POST_ERROR]", err);
    return unauthorizedResponse();
  }
}
