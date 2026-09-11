import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export interface AdminAuthResult {
  isAdmin: boolean;
  userId?: string;
  email?: string;
  error?: string;
}

/**
 * Validação por UUID Estático configurado na Vercel (ADMIN_USER_ID).
 * O acesso só será concedido se user_id === process.env.ADMIN_USER_ID.
 * Suporta também múltiplos IDs separados por vírgula.
 */
export function isSuperAdmin(userId?: string | null): boolean {
  if (!userId) return false;
  const configuredAdminId = process.env.ADMIN_USER_ID?.trim();
  if (!configuredAdminId) return false;

  const allowedIds = configuredAdminId.split(',').map((id) => id.trim()).filter(Boolean);
  return allowedIds.includes(userId);
}

/**
 * Verificação estrita Server-Side:
 * 1. O usuário deve estar autenticado.
 * 2. O user.id DEVE corresponder estritamente ao ADMIN_USER_ID configurado nas variáveis de ambiente.
 * 3. O usuário deve possuir is_admin = true e não estar banido no banco de dados.
 */
export async function verifyAdmin(): Promise<AdminAuthResult> {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { isAdmin: false, error: "Not Found" };
    }

    // Camada 1: Blindagem por UUID Estático (ADMIN_USER_ID na Vercel)
    if (!isSuperAdmin(user.id)) {
      return { isAdmin: false, error: "Not Found" };
    }

    // Camada 2: Validação de integridade no banco de dados
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("is_admin, is_banned")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return { isAdmin: false, error: "Not Found" };
    }

    if (profile.is_banned || !profile.is_admin) {
      return { isAdmin: false, error: "Not Found" };
    }

    return {
      isAdmin: true,
      userId: user.id,
      email: user.email,
    };
  } catch (err) {
    console.error("[ADMIN_AUTH_ERROR]", err);
    return { isAdmin: false, error: "Not Found" };
  }
}

/**
 * Ocultação de Rota: Retorna sempre 404 (Not Found) em vez de 403 (Proibido)
 * para impedir enumeração e descoberta de rotas administrativas por atacantes.
 */
export function notFoundResponse(message = "Not Found") {
  return NextResponse.json(
    { error: message },
    { status: 404 }
  );
}

export function unauthorizedResponse(message = "Not Found") {
  return notFoundResponse(message);
}
