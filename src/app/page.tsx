import Link from "next/link";
import {
  BarChart3,
  CalendarDays,
  ListOrdered,
  Trophy,
  UsersRound,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { getPublicDataset } from "@/lib/public-data";
import { AccessModal } from "@/components/access-modal";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const menuItems = [
  {
    href: "/equipos",
    title: "Equipos",
    description: "Plantillas, grupos y jugadores inscritos.",
    icon: UsersRound,
  },
  {
    href: "/resultados",
    title: "Resultados / Calendario",
    description: "Fechas, marcadores y cruces del torneo.",
    icon: CalendarDays,
  },
  {
    href: "/clasificacion",
    title: "Clasificacion",
    description: "Grupos, puntos y equipos clasificados.",
    icon: ListOrdered,
  },
  {
    href: "/estadisticas",
    title: "Estadisticas",
    description: "Goleadores, tarjetas y datos destacados.",
    icon: BarChart3,
  },
];

export default async function HomePage() {
  const { teams, matches } = await getPublicDataset();
  const finishedMatches = matches.filter((match) => match.status === "finished").length;

  return (
    <AppShell>
      <section className="space-y-8">
        <div
          className="hero-motion relative flex min-h-[15rem] items-end overflow-hidden rounded border border-ink bg-ink bg-cover bg-center text-white shadow-sm sm:min-h-[20rem] lg:min-h-[24rem]"
          style={{ backgroundImage: "url('/images/hero-futsal-court.png')" }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/35 to-transparent" />
          <div className="relative w-full p-5 sm:p-7 lg:p-8">
            <h1 className="max-w-4xl text-3xl font-black uppercase leading-none tracking-normal sm:text-6xl lg:text-7xl">
              Torneo Trives 2026
            </h1>
          </div>
          <div className="h-2 bg-gold-400" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="group animate-rise rounded border border-line bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-ink hover:shadow-lg"
              >
                <span className="mb-5 flex size-11 items-center justify-center rounded bg-gold-400 text-ink">
                  <Icon size={22} aria-hidden="true" />
                </span>
                <h2 className="mb-2 text-lg font-black uppercase">{item.title}</h2>
                <p className="text-sm leading-6 text-ink/65">{item.description}</p>
              </Link>
            );
          })}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded border border-ink bg-ink p-6 text-white shadow-sm">
            <p className="text-sm font-black uppercase text-gold-400">La Porra</p>
            <h2 className="mt-2 text-3xl font-black uppercase">Pronostica cada partido</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
              Acumula puntos acertando ganador, diferencia de goles, resultado
              exacto y primer goleador. Premio: cena en el Hostal La Viuda.
            </p>
            <div className="mt-5">
              <AccessModal
                mode="porra"
                title="La Porra"
                subtitle="Login o registro"
                triggerLabel="Acceder a la porra"
              />
            </div>
          </div>

          <div className="rounded border border-line bg-white p-5">
            <div className="mb-4 flex items-center gap-3">
              <Trophy className="text-gold-500" size={24} />
              <h2 className="text-xl font-black">Formato</h2>
            </div>
            <p className="text-sm leading-6 text-ink/70">
              12 equipos, 3 grupos de 4 equipos. Pasan primeros y segundos, mas
              los 2 mejores terceros. Desempates: resultado directo, penaltis,
              gol average, goles a favor y fair play.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-black uppercase">
              <span className="rounded bg-fog px-2 py-3">{teams.length} equipos</span>
              <span className="rounded bg-fog px-2 py-3">{matches.length} partidos</span>
              <span className="rounded bg-fog px-2 py-3">{finishedMatches} jugados</span>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
