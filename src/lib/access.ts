import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Verificação de propriedade de recursos no servidor.
 *
 * As rotas usam o cliente `service_role`, que IGNORA RLS. Isso torna cada
 * consulta responsável pela sua própria verificação de dono: um identificador
 * vindo do browser (conversation_id, notebook_id, ...) nunca é confiável.
 *
 * Estas funções centralizam essa verificação para não voltar a ser esquecida.
 */

export async function ownsConversation(
  db: SupabaseClient,
  conversationId: string,
  userId: string
): Promise<boolean> {
  const { data, error } = await db
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[ACCESS] Falha ao verificar conversa:", error.message);
    return false;
  }
  return Boolean(data);
}

export async function ownsNotebook(
  db: SupabaseClient,
  notebookId: string,
  userId: string
): Promise<boolean> {
  const { data, error } = await db
    .from("notebooks")
    .select("id")
    .eq("id", notebookId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[ACCESS] Falha ao verificar caderno:", error.message);
    return false;
  }
  return Boolean(data);
}

/** UUID v4-ish: evita enviar lixo para o Postgres e devolver erros internos. */
export function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}
