"use client";

import { LogOut } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LogoutButton() {
  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <button
      className="inline-flex items-center gap-2 rounded border border-line bg-white px-3 py-2 text-sm font-bold text-ink hover:border-ink"
      onClick={handleLogout}
      type="button"
    >
      <LogOut size={16} aria-hidden="true" />
      Salir
    </button>
  );
}
