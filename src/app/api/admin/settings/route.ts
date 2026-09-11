import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { verifyAdmin, unauthorizedResponse } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await verifyAdmin();
    if (!auth.isAdmin) {
      return unauthorizedResponse(auth.error);
    }

    const serviceClient = createServiceClient();
    const supabase = serviceClient || createClient();
    const { data: settings, error } = await supabase
      .from("payment_settings")
      .select("*")
      .eq("id", "default")
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ settings: settings || {} });
  } catch (err) {
    console.error("[ADMIN_SETTINGS_GET_ERROR]", err);
    return NextResponse.json({ error: "Erro ao carregar configurações bancárias." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await verifyAdmin();
    if (!auth.isAdmin) {
      return unauthorizedResponse(auth.error);
    }

    const body = await request.json();
    const { bank_name, account_holder, express_phone, iban, usd_to_aoa_rate, notes } = body;

    const serviceClient = createServiceClient();
    const supabase = serviceClient || createClient();
    const updatePayload = {
      bank_name: bank_name || "",
      account_holder: account_holder || "",
      express_phone: express_phone || "",
      iban: iban || "",
      usd_to_aoa_rate: Number(usd_to_aoa_rate) || 950,
      notes: notes || "",
      updated_at: new Date().toISOString()
    };

    const { data: updated, error } = await supabase
      .from("payment_settings")
      .upsert({
        id: "default",
        ...updatePayload
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      settings: updated,
      message: "Configurações bancárias atualizadas com sucesso!"
    });
  } catch (err) {
    console.error("[ADMIN_SETTINGS_POST_ERROR]", err);
    return NextResponse.json({ error: "Erro ao atualizar configurações bancárias." }, { status: 500 });
  }
}
