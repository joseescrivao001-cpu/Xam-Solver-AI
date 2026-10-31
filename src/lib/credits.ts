import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Consumo de créditos atómico.
 *
 * Substitui o padrão antigo (ler `credits_balance`, somar/subtrair em JS e
 * gravar), que perdia atualizações em pedidos concorrentes e não cobrava nada
 * quando o stream era interrompido.
 *
 * Degradação controlada: se a migração `2026-10-28_security_hardening.sql`
 * ainda não tiver sido aplicada, a função RPC não existe e devolvemos
 * `degraded: true` para o chamador manter o caminho legado — a aplicação
 * continua funcional, e o log avisa que a proteção atómica está inativa.
 */

const MISSING_FUNCTION_CODES = new Set(["42883", "PGRST202", "404"]);

/**
 * 42501 (insufficient_privilege) acontece quando o cliente disponível é o
 * autenticado e não o `service_role` (por exemplo, `SUPABASE_SERVICE_ROLE_KEY`
 * ausente). Nesse caso não queremos bloquear o utilizador com "créditos
 * insuficientes" — degradamos para o caminho legado e registamos o aviso.
 */
const NO_PRIVILEGE_CODES = new Set(["42501"]);

function isDegradable(code: string | undefined): boolean {
  if (!code) return false;
  return MISSING_FUNCTION_CODES.has(code) || NO_PRIVILEGE_CODES.has(code);
}

export interface ConsumeResult {
  /** true = crédito consumido (ou plano premium ilimitado). */
  charged: boolean;
  /** true = RPC indisponível; o chamador deve usar o caminho legado. */
  degraded: boolean;
}

export async function consumeCredit(
  db: SupabaseClient,
  userId: string
): Promise<ConsumeResult> {
  const { data, error } = await db.rpc("consume_credit", { p_user_id: userId });

  if (error) {
    if (isDegradable(error.code)) {
      console.warn(
        `[CREDITS] RPC consume_credit indisponível (${error.code}). ` +
          "A usar o caminho legado não atómico. Aplique a migração de segurança " +
          "e confirme que SUPABASE_SERVICE_ROLE_KEY está configurada."
      );
      return { charged: false, degraded: true };
    }
    console.error("[CREDITS] Falha ao consumir crédito:", error.message);
    return { charged: false, degraded: false };
  }

  return { charged: data === true, degraded: false };
}

export async function refundCredit(db: SupabaseClient, userId: string): Promise<void> {
  const { error } = await db.rpc("refund_credit", { p_user_id: userId });
  if (error && !MISSING_FUNCTION_CODES.has(error.code ?? "")) {
    console.error("[CREDITS] Falha ao reembolsar crédito:", error.message);
  }
}

export interface PlanSnapshot {
  planType: string;
  creditsBalance: number;
  exists: boolean;
}

export async function readPlan(db: SupabaseClient, userId: string): Promise<PlanSnapshot> {
  const { data } = await db
    .from("profiles")
    .select("credits_balance, plan_type")
    .eq("id", userId)
    .maybeSingle();

  return {
    planType: data?.plan_type ?? "free",
    creditsBalance: data?.credits_balance ?? 0,
    exists: Boolean(data),
  };
}

export function hasAccess(plan: PlanSnapshot): boolean {
  return plan.planType === "premium" || (plan.exists && plan.creditsBalance >= 1);
}
