import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyAdmin, unauthorizedResponse } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await verifyAdmin();
    if (!auth.isAdmin) {
      return unauthorizedResponse(auth.error);
    }

    const supabase = createClient();
    const { data: logs, error } = await supabase
      .from("api_error_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.warn("[ADMIN_LOGS_WARNING] Tabela api_error_logs pode ainda não ter registros:", error.message);
      return NextResponse.json({ logs: [] });
    }

    return NextResponse.json({ logs: logs || [] });
  } catch (err) {
    console.error("[ADMIN_LOGS_ERROR]", err);
    return NextResponse.json({ error: "Erro ao carregar logs de sistema." }, { status: 500 });
  }
}
