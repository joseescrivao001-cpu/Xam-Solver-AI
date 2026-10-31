import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/plans";

export const dynamic = "force-dynamic";

/**
 * Configuração pública de pagamento (dados bancários + planos).
 *
 * Correções (2026-10-28):
 *  - Os preços passaram a vir de `@/lib/plans` (fonte única). Antes, este
 *    ficheiro devolvia Pro $5 / Premium $39 no caminho normal e Pro $10 /
 *    Ultra $19 no fallback — o preço mostrado ao cliente mudava conforme a
 *    API de câmbio estivesse disponível ou não.
 *  - O plano "ultra" (descontinuado) saiu da resposta.
 *  - Texto corrompido ("Cr�ditos") corrigido.
 */

interface PaymentSettingsRow {
  bank_name?: string | null;
  account_holder?: string | null;
  express_phone?: string | null;
  iban?: string | null;
  notes?: string | null;
  usd_to_aoa_rate?: number | string | null;
}

const FALLBACK_RATE = 950;

function buildPlanPayload(rate: number) {
  const toKz = (usd: number) => Math.round(usd * rate);
  const fmt = (value: number) => `${value.toLocaleString("pt-AO")} Kz`;

  return {
    pro: {
      id: PLANS.pro.id,
      name: PLANS.pro.name,
      usd: PLANS.pro.priceUsd,
      aoa: toKz(PLANS.pro.priceUsd),
      formatted_aoa: fmt(toKz(PLANS.pro.priceUsd)),
      credits: `${PLANS.pro.credits.toLocaleString("pt-PT")} Créditos`,
    },
    premium: {
      id: PLANS.premium.id,
      name: PLANS.premium.name,
      usd: PLANS.premium.priceUsd,
      aoa: toKz(PLANS.premium.priceUsd),
      formatted_aoa: fmt(toKz(PLANS.premium.priceUsd)),
      credits: "Ilimitado",
    },
  };
}

export async function GET() {
  let settings: PaymentSettingsRow | null = null;

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("payment_settings")
      .select("*")
      .eq("id", "default")
      .maybeSingle();

    if (error) {
      console.warn("[PAYMENT_SETTINGS] Leitura indisponível:", error.message);
    }
    settings = (data as PaymentSettingsRow | null) ?? null;
  } catch (err) {
    console.warn("[PAYMENT_SETTINGS] Falha ao ler configuração:", err);
  }

  const fallbackRate = Number(settings?.usd_to_aoa_rate) || FALLBACK_RATE;
  let liveRate = fallbackRate;

  try {
    const exchange = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 3600 },
    });
    if (exchange.ok) {
      const data = await exchange.json();
      if (typeof data?.rates?.AOA === "number") {
        liveRate = Math.round(data.rates.AOA);
      }
    }
  } catch {
    console.warn("[PAYMENT_SETTINGS] Câmbio indisponível, a usar taxa de referência.");
  }

  return NextResponse.json({
    bank_name: settings?.bank_name || "BFA / BAI",
    account_holder: settings?.account_holder || "José Escrivão Silvestre",
    express_phone: settings?.express_phone || "",
    iban: settings?.iban || "",
    notes:
      settings?.notes ||
      "Envie o comprovativo após a transferência para ativação quase imediata.",
    usd_to_aoa_rate: liveRate,
    plans: buildPlanPayload(liveRate),
  });
}
