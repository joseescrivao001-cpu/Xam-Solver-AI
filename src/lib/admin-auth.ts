import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export interface AdminAuthResult {
  isAdmin: boolean;
  userId?: string;
  email?: string;
  error?: string;
}

export async function verifyAdmin(): Promise<AdminAuthResult> {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { isAdmin: false, error: "Não autenticado." };
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("is_admin, is_banned")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return { isAdmin: false, error: "Perfil não encontrado." };
    }

    if (profile.is_banned) {
      return { isAdmin: false, error: "Esta conta foi suspensa." };
    }

    if (!profile.is_admin) {
      return { isAdmin: false, error: "Acesso restrito a administradores." };
    }

    return {
      isAdmin: true,
      userId: user.id,
      email: user.email
    };
  } catch (err) {
    console.error("[ADMIN_AUTH_ERROR]", err);
    return { isAdmin: false, error: "Erro interno de validação." };
  }
}

export function unauthorizedResponse(message = "Acesso negado. Apenas administradores autorizados.") {
  return NextResponse.json(
    { error: message, code: "UNAUTHORIZED_ADMIN" },
    { status: 403 }
  );
}
