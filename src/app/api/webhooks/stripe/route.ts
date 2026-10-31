import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { creditsForPlan, normalizePlanId } from "@/lib/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook do Stripe — ativação real dos planos.
 *
 * Antes deste ficheiro não existia fulfillment: o checkout redirecionava para
 * `/dashboard?upgrade=success` e o plano nunca era ativado. Quem pagava com
 * cartão ficava em Free. O `STRIPE_WEBHOOK_SECRET` estava no ambiente sem uso.
 *
 * Garantias:
 *  - assinatura verificada (HMAC SHA-256 sobre `timestamp.payload`, tolerância
 *    de 5 minutos contra replay);
 *  - idempotência pelo id do evento (tabela `payment_events`, PK única);
 *  - a ativação usa `service_role`, nunca valores vindos do cliente.
 */

const TOLERANCE_SECONDS = 300;

function verifySignature(payload: string, header: string | null, secret: string): boolean {
  if (!header) return false;

  const parts = Object.fromEntries(
    header.split(",").map((part) => {
      const [key, ...rest] = part.trim().split("=");
      return [key, rest.join("=")];
    })
  ) as Record<string, string | undefined>;

  const timestamp = parts["t"];
  const provided = parts["v1"];
  if (!timestamp || !provided) return false;

  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (!Number.isFinite(age) || age > TOLERANCE_SECONDS) return false;

  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  return a.length === b.length && timingSafeEqual(a, b);
}

interface StripeEvent {
  id: string;
  type: string;
  data?: {
    object?: {
      id?: string;
      payment_status?: string;
      amount_total?: number;
      currency?: string;
      customer_email?: string;
      client_reference_id?: string;
      metadata?: { user_id?: string; plan?: string };
    };
  };
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!secret) {
    console.error("[STRIPE_WEBHOOK] STRIPE_WEBHOOK_SECRET não configurado.");
    return NextResponse.json({ error: "Webhook não configurado." }, { status: 503 });
  }

  const payload = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!verifySignature(payload, signature, secret)) {
    console.warn("[STRIPE_WEBHOOK] Assinatura inválida ou expirada.");
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 400 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(payload) as StripeEvent;
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const db = createServiceClient();
  if (!db) {
    console.error("[STRIPE_WEBHOOK] service_role indisponível.");
    return NextResponse.json({ error: "Backend indisponível." }, { status: 503 });
  }

  try {
    // Idempotência: a PK de payment_events impede processar o mesmo evento duas
    // vezes. Um conflito significa "já tratado" — resposta 200 para o Stripe
    // parar de repetir.
    const { error: eventError } = await db.from("payment_events").insert({
      id: event.id,
      provider: "stripe",
      event_type: event.type,
      payload: event as unknown as Record<string, unknown>,
    });

    if (eventError) {
      if (eventError.code === "23505") {
        return NextResponse.json({ received: true, duplicate: true });
      }
      console.error("[STRIPE_WEBHOOK] Falha ao registar evento:", eventError.message);
      return NextResponse.json({ error: "Falha ao registar evento." }, { status: 500 });
    }

    if (event.type !== "checkout.session.completed") {
      return NextResponse.json({ received: true, ignored: event.type });
    }

    const session = event.data?.object;
    const userId = session?.metadata?.user_id || session?.client_reference_id;
    const plan = normalizePlanId(session?.metadata?.plan);

    if (!userId) {
      console.error("[STRIPE_WEBHOOK] Sessão sem user_id:", session?.id);
      return NextResponse.json({ received: true, pending_manual_review: true });
    }

    if (session?.payment_status && session.payment_status !== "paid") {
      return NextResponse.json({ received: true, awaiting_payment: session.payment_status });
    }

    const credits = creditsForPlan(plan);

    const { error: updateError } = await db
      .from("profiles")
      .update({
        plan_type: plan,
        credits_balance: credits,
        stripe_customer_id: session?.customer_email ?? null,
        last_checkout_session: session?.id ?? null,
      })
      .eq("id", userId);

    if (updateError) {
      console.error("[STRIPE_WEBHOOK] Falha ao ativar plano:", updateError.message);
      // 500 → o Stripe volta a tentar.
      return NextResponse.json({ error: "Falha ao ativar plano." }, { status: 500 });
    }

    await db.from("payment_events").update({ user_id: userId }).eq("id", event.id);

    return NextResponse.json({ received: true, activated: plan });
  } catch (error) {
    console.error("[STRIPE_WEBHOOK] Erro:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
