import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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

  return (
    <div className="flex h-screen w-full overflow-hidden transition-colors duration-300 dark:bg-zinc-950 dark:text-zinc-100 bg-white text-zinc-900">
      {/* We pass the user and profile down via children if needed, or children fetch it */}
      {children}
    </div>
  );
}
