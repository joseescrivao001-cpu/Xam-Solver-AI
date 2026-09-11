import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const serviceClient = createServiceClient();
    const db = serviceClient || supabase;

    // Buscar perfil no banco
    const { data: profile, error: profileError } = await db
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("[USER_PROFILE_GET_ERROR]", profileError);
    }

    // Extrair metadados do Google Auth se existirem
    const googleAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;
    const googleName = user.user_metadata?.full_name || user.user_metadata?.name || null;

    let finalProfile = profile;

    // Se o perfil não existir ainda, criar agora
    if (!finalProfile) {
      const isOwner = user.email?.toLowerCase().trim() === "joseescrivao001@gmail.com";
      const { data: newProfile } = await db
        .from("profiles")
        .insert({
          id: user.id,
          email: user.email,
          credits_balance: isOwner ? 1000000 : 5,
          plan_type: isOwner ? "premium" : "free",
          is_admin: isOwner,
          avatar_url: googleAvatar,
          full_name: googleName,
        })
        .select()
        .single();

      finalProfile = newProfile;
    } else {
      // Sincronizar avatar/nome do Google se o perfil estiver sem avatar
      const updates: Record<string, unknown> = {};
      if (!finalProfile.avatar_url && googleAvatar) {
        updates.avatar_url = googleAvatar;
      }
      if (!finalProfile.full_name && googleName) {
        updates.full_name = googleName;
      }

      // Se for o e-mail do fundador, garantir que is_admin e premium estejam ativos
      if (user.email?.toLowerCase().trim() === "joseescrivao001@gmail.com") {
        if (!finalProfile.is_admin) updates.is_admin = true;
        if (finalProfile.plan_type !== "premium") updates.plan_type = "premium";
        if ((finalProfile.credits_balance || 0) < 1000) updates.credits_balance = 1000000;
      }

      if (Object.keys(updates).length > 0) {
        const { data: updated } = await db
          .from("profiles")
          .update(updates)
          .eq("id", user.id)
          .select()
          .single();

        if (updated) finalProfile = updated;
      }
    }

    return NextResponse.json({
      success: true,
      profile: finalProfile,
      user: {
        id: user.id,
        email: user.email,
        googleAvatar,
        googleName,
      },
    });
  } catch (err) {
    console.error("[USER_PROFILE_ERROR]", err);
    return NextResponse.json({ error: "Erro interno ao carregar perfil." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const body = await request.json();
    const { avatar_url, full_name } = body;

    const serviceClient = createServiceClient();
    const db = serviceClient || supabase;

    const updatePayload: Record<string, unknown> = {};
    if (avatar_url !== undefined) updatePayload.avatar_url = avatar_url;
    if (full_name !== undefined) updatePayload.full_name = full_name;

    const { data: updated, error } = await db
      .from("profiles")
      .update(updatePayload)
      .eq("id", user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      profile: updated,
      message: "Perfil atualizado com sucesso!",
    });
  } catch (err) {
    console.error("[USER_PROFILE_POST_ERROR]", err);
    return NextResponse.json({ error: "Erro ao salvar perfil." }, { status: 500 });
  }
}
