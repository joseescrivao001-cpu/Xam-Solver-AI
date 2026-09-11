import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createClient();
    
    // 1. Buscar configurações dinâmicas do banco de dados
    const { data: dbSettings, error: dbError } = await supabase
      .from("payment_settings")
      .select("*")
      .eq("id", "default")
      .maybeSingle();

    if (dbError) {
      console.warn("[PAYMENT_SETTINGS] Aviso ao ler payment_settings:", dbError.message);
    }

    // Configurações padrão com fallback seguro
    const bankName = dbSettings?.bank_name || "BFA / BAI";
    const accountHolder = dbSettings?.account_holder || "José Escrivão Silvestre";
    const expressPhone = dbSettings?.express_phone || "+244 930 339 436";
    const iban = dbSettings?.iban || "";
    const notes = dbSettings?.notes || "Envie o comprovativo após a transferência para aprovação imediata.";
    const fallbackRate = Number(dbSettings?.usd_to_aoa_rate) || 950;

    // 2. Buscar cotação cambial em tempo real USD -> AOA (Kwanza)
    let liveRate = fallbackRate;
    try {
      const exchangeRes = await fetch("https://open.er-api.com/v6/latest/USD", {
        next: { revalidate: 3600 } // cache de 1 hora
      });
      if (exchangeRes.ok) {
        const data = await exchangeRes.json();
        if (data?.rates?.AOA && typeof data.rates.AOA === "number") {
          liveRate = Math.round(data.rates.AOA);
        }
      }
    } catch (exchangeErr) {
      console.warn("[EXCHANGE_RATE] Falha ao consultar câmbio ao vivo, usando fallback:", exchangeErr);
    }

    // Calcular valores dos planos em Kwanza em tempo real
    const ultraUsd = 19;
    const premiumUsd = 39;
    const ultraAoa = Math.round(ultraUsd * liveRate);
    const premiumAoa = Math.round(premiumUsd * liveRate);

    return NextResponse.json({
      bank_name: bankName,
      account_holder: accountHolder,
      express_phone: expressPhone,
      iban: iban,
      notes: notes,
      usd_to_aoa_rate: liveRate,
      plans: {
        ultra: {
          usd: ultraUsd,
          aoa: ultraAoa,
          formatted_aoa: ultraAoa.toLocaleString("pt-AO") + " Kz"
        },
        premium: {
          usd: premiumUsd,
          aoa: premiumAoa,
          formatted_aoa: premiumAoa.toLocaleString("pt-AO") + " Kz"
        }
      }
    });
  } catch (err) {
    console.error("[PAYMENT_SETTINGS_ERROR]", err);
    return NextResponse.json({
      bank_name: "BFA / BAI",
      account_holder: "José Escrivão Silvestre",
      express_phone: "+244 930 339 436",
      iban: "",
      usd_to_aoa_rate: 950,
      plans: {
        ultra: { usd: 19, aoa: 19000, formatted_aoa: "19.000 Kz" },
        premium: { usd: 39, aoa: 39000, formatted_aoa: "39.000 Kz" }
      }
    });
  }
}
