import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSuperAdmin } from "@/lib/admin-auth";
import AdminCommandCenter from "@/components/admin/admin-command-center";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin Command Center | Exam Solver AI",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Blindagem de Acesso: Validação por UUID Estático (ADMIN_USER_ID da Vercel)
  // Se o user_id não for idêntico ao ADMIN_USER_ID configurado, oculta totalmente com 404
  if (!user || !isSuperAdmin(user.id)) {
    notFound();
  }

  // 2. Validação no Banco de Dados: status is_admin e checagem de banimento
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, is_banned")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin || profile?.is_banned) {
    notFound();
  }

  return <AdminCommandCenter />;
}
