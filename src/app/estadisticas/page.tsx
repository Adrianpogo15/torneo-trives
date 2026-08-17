import { AppShell } from "@/components/app-shell";
import {
  formatPlayerName,
  getPublicDataset,
  getTeamName,
} from "@/lib/public-data";
import { StatsTables } from "@/components/stats-tables";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function StatsPage() {
  const { events, players, teams } = await getPublicDataset();

  const playerRows = players
    .map((player) => {
      const playerEvents = events.filter((event) => event.player_id === player.id);

      return {
        player,
        goals: playerEvents.filter((event) => event.event_type === "goal").length,
        yellowCards: playerEvents.filter((event) => event.event_type === "yellow_card").length,
        redCards: playerEvents.filter((event) => event.event_type === "red_card").length,
      };
    })
    .sort((a, b) => b.goals - a.goals || a.yellowCards + a.redCards - (b.yellowCards + b.redCards));

  const scorerRows = playerRows.map((row) => ({
    playerId: row.player.id,
    playerName: formatPlayerName(row.player),
    teamName: getTeamName(teams, row.player.team_id),
    goals: row.goals,
    yellowCards: row.yellowCards,
    redCards: row.redCards,
  }));
  const cardRows = [...scorerRows].sort(
    (a, b) => b.yellowCards + b.redCards * 2 - (a.yellowCards + a.redCards * 2)
  );

  return (
    <AppShell>
      <section className="space-y-6">
        <div>
          <p className="text-sm font-bold uppercase text-gold-700">Datos del torneo</p>
          <h1 className="text-3xl font-black uppercase text-ink">Estadisticas</h1>
        </div>

        <StatsTables scorerRows={scorerRows} cardRows={cardRows} />
      </section>
    </AppShell>
  );
}
