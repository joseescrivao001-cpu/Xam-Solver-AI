import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PLANS, isPlanId } from "@/lib/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Criação de sessão de Checkout no Stripe.
 *
 * Correções (2026-10-28):
 *  - Removido o fallback "simulado": antes, sem chave configurada devolvia
 *    `/dashboard?upgrade=success`, ou seja, apresentava sucesso sem cobrança.
 *  - Removido o redirecionamento para `success` quando o Stripe não devolvia
 *    `session.url` (mesmo problema).
 *  - O preço vem de `@/lib/plans`; o plano é validado (nada de `plan_type`
 *    arbitrário vindo do cliente).
 *  - A sessão leva `metadata.user_id` e `metadata.plan`, que o webhook usa para
 *    ativar o plano. A ativação NUNCA acontece no cliente.
 */
export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Autenticação obrigatória." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const planType = body?.plan_type;

    if (!isPlanId(planType) || planType === "free") {
      return NextResponse.json({ error: "Plano inválido." }, { status: 400 });
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
    if (!stripeKey) {
      return NextResponse.json(
        { error: "Pagamento com cartão temporariamente indisponível. Use a transferência." },
        { status: 503 }
      );
    }

    const origin =
      req.headers.get("origin") ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://xam-solver-ai.vercel.app";

    const plan = PLANS[planType];
    const params = new URLSearchParams();

    params.append("mode", "payment");
    params.append("payment_method_types[]", "card");
    params.append("line_items[0][price_data][currency]", "usd");
    params.append("line_items[0][price_data][product_data][name]", `Exam Solver AI ${plan.name}`);
    params.append("line_items[0][price_data][unit_amount]", String(plan.priceUsd * 100));
    params.append("line_items[0][quantity]", "1");

    if (user.email) params.append("customer_email", user.email);

    // Contrato com o webhook: quem paga e o que pagou.
    params.append("client_reference_id", user.id);
    params.append("metadata[user_id]", user.id);
    params.append("metadata[plan]", plan.id);

    params.append("success_url", `${origin}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`);
    params.append("cancel_url", `${origin}/dashboard?checkout=cancelled`);

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const session = await stripeRes.json();

    if (!stripeRes.ok || !session?.url) {
      console.error("[STRIPE_CHECKOUT] Falha ao criar sessão:", session?.error?.message ?? stripeRes.status);
      return NextResponse.json(
        { error: "Não foi possível iniciar o pagamento. Tente novamente." },
        { status: 502 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[STRIPE_CHECKOUT] Erro:", error);
    return NextResponse.json({ error: "Erro ao iniciar o checkout." }, { status: 500 });
  }
}
