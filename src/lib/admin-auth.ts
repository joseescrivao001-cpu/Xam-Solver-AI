import { createClient } from "@/lib/supabase/server";
import { isConfiguredAdmin } from "@/lib/admin-config";
import { NextResponse } from "next/server";

/**
 * Autorização administrativa.
 *
 * Alteração de segurança (2026-10-28): os identificadores de administrador
 * deixaram de estar fixos no código. Antes existiam um e-mail e dois UUIDs
 * literais em `middleware.ts`, neste ficheiro e em `user/profile/route.ts`,
 * e a variável de ambiente era apenas ADITIVA — remover um admin do ambiente
 * não o removia da aplicação, só uma alteração de código o faria.
 *
 * Configuração (Vercel → Environment Variables):
 *   ADMIN_USER_ID   UUIDs separados por vírgula (autoridade máxima)
 *   ADMIN_EMAILS    e-mails separados por vírgula
 *
 * Falha fechada: sem configuração, ninguém é administrador.
 */

export interface AdminAuthResult {
  isAdmin: boolean;
  userId?: string;
  email?: string;
  error?: string;
}

export function isSuperAdmin(
  userId?: string | null,
  userEmail?: string | null
): boolean {
  return isConfiguredAdmin(userId, userEmail);
}

/**
 * Verificação estrita do lado do servidor:
 *  1. sessão válida;
 *  2. identidade consta da configuração de ambiente;
 *  3. perfil existe, `is_admin = true` e não está banido.
 */
export async function verifyAdmin(): Promise<AdminAuthResult> {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { isAdmin: false, error: "Not Found" };
    }

    if (!isSuperAdmin(user.id, user.email)) {
      return { isAdmin: false, error: "Not Found" };
    }

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

    return { isAdmin: true, userId: user.id, email: user.email };
  } catch (err) {
    console.error("[ADMIN_AUTH_ERROR]", err);
    return { isAdmin: false, error: "Not Found" };
  }
}

/**
 * Ocultação de rota: 404 em vez de 403 para não permitir enumeração de
 * endpoints administrativos.
 */
export function notFoundResponse(message = "Not Found") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function unauthorizedResponse(message = "Not Found") {
  return notFoundResponse(message);
}
