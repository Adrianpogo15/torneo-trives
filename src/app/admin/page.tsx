import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { StatusPill } from "@/components/status-pill";
import { createServerAuthClient } from "@/lib/supabase/auth-server";
import { LogoutButton } from "@/components/logout-button";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

export default async function AdminPage() {
  const supabase = await createServerAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role")
    .eq("id", user.id)
    .maybeSingle<{ display_name: string; role: "admin" | "user" }>();

  if (profile?.role !== "admin") {
    redirect("/");
  }

  return (
    <AppShell>
      <section className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <StatusPill status="ok">Admin conectado</StatusPill>
          <LogoutButton />
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-ink">Administracion</h1>
        </div>

        <AdminDashboard />
      </section>
    </AppShell>
  );
}
