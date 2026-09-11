import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { verifyAdmin, unauthorizedResponse } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = await verifyAdmin();
    if (!auth.isAdmin) {
      return unauthorizedResponse(auth.error);
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all";
    const search = searchParams.get("search") || "";

    const serviceClient = createServiceClient();
    const supabase = serviceClient || createClient();
    let query = supabase
      .from("payment_proofs")
      .select("*")
      .order("created_at", { ascending: false });

    if (status !== "all") {
      query = query.eq("status", status);
    }

    if (search.trim()) {
      query = query.or(`user_email.ilike.%${search}%,plan_type.ilike.%${search}%,id.eq.${search}`);
    }

    const { data: proofs, error } = await query;

    if (error) throw error;

    return NextResponse.json({ proofs: proofs || [] });
  } catch (err) {
    console.error("[ADMIN_PAYMENTS_GET_ERROR]", err);
    return NextResponse.json({ error: "Erro ao buscar comprovativos." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await verifyAdmin();
    if (!auth.isAdmin) {
      return unauthorizedResponse(auth.error);
    }

    const body = await request.json();
    const { proof_id, action, admin_notes } = body;

    if (!proof_id || !action || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
    }

    const serviceClient = createServiceClient();
    const supabase = serviceClient || createClient();

    // Buscar comprovativo
    const { data: proof, error: proofErr } = await supabase
      .from("payment_proofs")
      .select("*")
      .eq("id", proof_id)
      .single();

    if (proofErr || !proof) {
      return NextResponse.json({ error: "Comprovativo não encontrado." }, { status: 404 });
    }

    if (action === "approve") {
      const plan = proof.plan_type;
      let creditsToAdd = 1000;
      if (plan === "ultra") creditsToAdd = 1000000;
      if (plan === "premium") creditsToAdd = 999999;

      // 1. Atualizar Perfil do Usuário
      const { data: profile } = await supabase
        .from("profiles")
        .select("credits_balance")
        .eq("id", proof.user_id)
        .single();

      const currentBalance = profile?.credits_balance || 0;
      const newBalance = currentBalance + creditsToAdd;

      const { error: updateProfileErr } = await supabase
        .from("profiles")
        .update({
          plan_type: plan,
          credits_balance: newBalance
        })
        .eq("id", proof.user_id);

      if (updateProfileErr) {
        console.error("[APPROVE_UPDATE_PROFILE_ERR]", updateProfileErr);
        return NextResponse.json({ error: "Erro ao creditar perfil do usuário." }, { status: 500 });
      }

      // 2. Atualizar Comprovativo
      const { error: updateProofErr } = await supabase
        .from("payment_proofs")
        .update({
          status: "approved",
          admin_notes: admin_notes || "Aprovado via Admin Command Center.",
          updated_at: new Date().toISOString()
        })
        .eq("id", proof_id);

      if (updateProofErr) {
        console.error("[APPROVE_UPDATE_PROOF_ERR]", updateProofErr);
        return NextResponse.json({ error: "Erro ao atualizar status do comprovativo." }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `Pagamento aprovado! Plano ${plan.toUpperCase()} ativado com +${creditsToAdd.toLocaleString("pt-AO")} créditos.`
      });
    } else {
      // Rejeição
      const { error: rejectErr } = await supabase
        .from("payment_proofs")
        .update({
          status: "rejected",
          admin_notes: admin_notes || "Comprovativo rejeitado pelo administrador.",
          updated_at: new Date().toISOString()
        })
        .eq("id", proof_id);

      if (rejectErr) throw rejectErr;

      return NextResponse.json({
        success: true,
        message: "Comprovativo marcado como rejeitado."
      });
    }
  } catch (err) {
    console.error("[ADMIN_PAYMENTS_POST_ERROR]", err);
    return NextResponse.json({ error: "Erro ao processar ação de pagamento." }, { status: 500 });
  }
}
