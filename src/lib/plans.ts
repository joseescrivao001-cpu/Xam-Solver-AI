/**
 * FONTE ÚNICA DE VERDADE dos planos, preços e créditos.
 *
 * Antes existiam cinco tabelas de preços contraditórias:
 *   lib/plan-config.ts ................ Pro $5 / Premium $10 · 20.000 / 1.000.000
 *   api/payment-settings (normal) ..... Pro $5 / Ultra $10 / Premium $39
 *   api/payment-settings (fallback) ... Pro $10 / Ultra $19 / Premium $39
 *   components/pricing-modal.tsx ...... "$10 USD" / "$39 USD" literais
 *   admin/payments + SQL .............. 2.000 / 10.000 / 999.999.999 / 1.000.000
 *
 * Decisão de produto (2026-10-28): três planos — Free, Pro, Premium — com os
 * valores que o checkout do Stripe já cobra. O tier "ultra" foi descontinuado.
 *
 * Regra de arquitetura: o servidor é a autoridade. O frontend apresenta estes
 * valores, nunca decide quem tem acesso premium.
 */

export type PlanId = "free" | "pro" | "premium";

export interface PlanDefinition {
  id: PlanId;
  name: string;
  /** Preço mensal em USD. */
  priceUsd: number;
  /** Valor de referência em Kwanzas (a UI mostra conversão ao vivo da API). */
  priceAoa: number;
  /** Créditos concedidos na ativação. */
  credits: number;
  /** Sem consumo de créditos. */
  unlimited: boolean;
  tagline: string;
  features: string[];
}

/** Créditos atribuídos a cada conta nova. */
export const SIGNUP_CREDITS = 50;

/** Resoluções gratuitas antes de exigir conta. */
export const GUEST_CREDITS = 5;

/** Saldo atribuído ao plano premium (a UI mostra "Ilimitado"). */
export const PREMIUM_CREDITS = 1_000_000;

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    name: "Free",
    priceUsd: 0,
    priceAoa: 0,
    credits: SIGNUP_CREDITS,
    unlimited: false,
    tagline: "Para começar a estudar hoje.",
    features: [
      "50 resoluções incluídas",
      "Fotografia, PDF e texto",
      "Resolução passo a passo",
      "Fórmulas em KaTeX",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceUsd: 5,
    priceAoa: 5_000,
    credits: 20_000,
    unlimited: false,
    tagline: "Para o semestre inteiro.",
    features: [
      "20.000 resoluções",
      "Modelos avançados de raciocínio",
      "Cadernos de estudo e notas",
      "Resumos, exercícios e quizzes",
      "Histórico completo de aprendizagem",
    ],
  },
  premium: {
    id: "premium",
    name: "Premium",
    priceUsd: 10,
    priceAoa: 10_000,
    credits: PREMIUM_CREDITS,
    unlimited: true,
    tagline: "Sem limites, sem interrupções.",
    features: [
      "Resoluções ilimitadas",
      "Modelos de visão de topo",
      "Todos os recursos do Pro",
      "Prioridade no processamento",
      "Suporte direto",
    ],
  },
};

export const PLAN_IDS = Object.keys(PLANS) as PlanId[];

/** Planos com cobrança efetiva (usado pelo checkout). */
export const PAID_PLANS: PlanId[] = ["pro", "premium"];

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && value in PLANS;
}

/** Normaliza identificadores legados: "ultra" deixa de existir. */
export function normalizePlanId(value: unknown): PlanId {
  if (value === "ultra") return "premium";
  return isPlanId(value) ? value : "free";
}

export function getPlan(planId: unknown): PlanDefinition {
  return PLANS[normalizePlanId(planId)];
}

/** Créditos a conceder ao ativar um plano. */
export function creditsForPlan(planId: unknown): number {
  return getPlan(planId).credits;
}

/** O plano tem consumo ilimitado? */
export function isUnlimitedPlan(planId: unknown): boolean {
  return getPlan(planId).unlimited;
}

export function planLabel(planId: unknown): string {
  return getPlan(planId).name;
}
