import { AppShell } from "@/components/app-shell";
import { getGroupedTeams, getPublicDataset } from "@/lib/public-data";
import { TeamsBrowser } from "@/components/teams-browser";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TeamsPage() {
  const { teams, players, groups, groupTeams, events, matches } = await getPublicDataset();
  const goalsByPlayer = events.reduce<Record<string, number>>((acc, event) => {
    if (event.player_id && event.event_type === "goal") {
      acc[event.player_id] = (acc[event.player_id] || 0) + 1;
    }

    return acc;
  }, {});
  const groupedTeams = getGroupedTeams(teams, players, groups, groupTeams).map((team) => ({
    ...team,
    players: team.players
      .map((player) => ({
        ...player,
        goals: goalsByPlayer[player.id] || 0,
      }))
      .sort((a, b) => b.goals - a.goals || a.last_name.localeCompare(b.last_name)),
  }));

  return (
    <AppShell>
      <section className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase text-gold-700">Plantillas</p>
            <h1 className="text-3xl font-black uppercase text-ink">Equipos</h1>
          </div>
          <p className="text-sm text-ink/60">{teams.length} equipos inscritos</p>
        </div>

        <TeamsBrowser teams={groupedTeams} matches={matches} />
      </section>
    </AppShell>
  );
}
