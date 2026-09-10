import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full overflow-hidden transition-colors duration-300 dark:bg-[#131314] dark:text-[#e3e3e3] bg-[#f9f9fa] text-[#1f1f1f]">
      {children}
    </div>
  );
}
