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
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 border-b bg-card px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">Exam Solver AI</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              <Coins className="h-4 w-4" />
              {profile?.credits_balance ?? 0} Créditos
            </div>
            <form action="/auth/signout" method="post">
              <Button variant="ghost" size="icon" title="Sair">
                <LogOut className="h-5 w-5" />
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1 p-6">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
