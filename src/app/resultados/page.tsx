import { AppShell } from "@/components/app-shell";
import { getPublicDataset } from "@/lib/public-data";
import { ResultsBrowser } from "@/components/results-browser";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ResultsPage() {
  const { matches, teams, groups, stages, events, players } = await getPublicDataset();

  return (
    <AppShell>
      <section className="space-y-6">
        <div>
          <p className="text-sm font-bold uppercase text-gold-700">Partidos</p>
          <h1 className="text-3xl font-black uppercase text-ink">Resultados / Calendario</h1>
        </div>

        <ResultsBrowser
          matches={matches}
          teams={teams}
          groups={groups}
          stages={stages}
          events={events}
          players={players}
        />
      </section>
    </AppShell>
  );
}
