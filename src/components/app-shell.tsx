import Link from "next/link";
import { BarChart3, ListOrdered, Ticket, Trophy, UsersRound } from "lucide-react";
import { AccessModal } from "@/components/access-modal";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const navItems = [
    { href: "/equipos", label: "Equipos", icon: UsersRound },
    { href: "/resultados", label: "Resultados", icon: Trophy },
    { href: "/clasificacion", label: "Clasificacion", icon: ListOrdered },
    { href: "/estadisticas", label: "Estadisticas", icon: BarChart3 },
    { href: "/porra", label: "Porra", icon: Ticket },
  ];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-ink text-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded bg-gold-400 text-ink">
              <Trophy size={22} aria-hidden="true" />
            </span>
            <span>
              <span className="block text-lg font-bold leading-tight">
                Torneo Trives
              </span>
              <span className="block text-xs text-white/60">Futbol sala</span>
            </span>
          </Link>

          <div className="md:hidden">
            <AccessModal
              mode="admin"
              title="Acceso"
              subtitle="Zona de gestion"
              triggerLabel=""
              triggerClassName="inline-flex size-10 items-center justify-center rounded bg-gold-400 text-ink hover:bg-gold-300"
            />
          </div>

          <nav className="hidden items-center gap-1 text-sm font-medium md:flex">
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex items-center gap-2 rounded px-3 py-2 text-white/75 hover:bg-white/10 hover:text-white"
                >
                  <Icon size={16} aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
            <AccessModal
              mode="admin"
              title="Acceso"
              subtitle="Zona de gestion"
              triggerLabel=""
              triggerClassName="inline-flex size-10 items-center justify-center rounded bg-gold-400 text-ink hover:bg-gold-300"
            />
          </nav>
        </div>

        <nav className="grid grid-cols-5 border-t border-white/10 text-[10px] font-semibold md:hidden">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex min-h-14 flex-col items-center justify-center gap-1 text-white/75 hover:bg-white/10 hover:text-white"
              >
                <Icon size={17} aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
