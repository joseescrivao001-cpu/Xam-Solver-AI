import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut, Coins } from "lucide-react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  // Buscar os créditos do usuário
  const { data: profile } = await supabase
    .from("profiles")
    .select("credits_balance")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex h-screen w-full bg-zinc-950 overflow-hidden text-zinc-100">
      {/* We pass the user and profile down via children if needed, or children fetch it */}
      {children}
    </div>
  );
}
