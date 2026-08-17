import { AppShell } from "@/components/app-shell";
import {
  getPublicDataset,
  getTeamName,
  sortBestThirds,
  sortStandings,
} from "@/lib/public-data";

export default async function StandingsPage() {
  const { groups, standings, teams, matches } = await getPublicDataset();
  const rowsByGroup = groups.map((group) => ({
    group,
    rows: sortStandings(
      standings.filter((row) => row.group_id === group.id),
      matches
    ),
  }));
  const bestThirdIds = new Set(
    sortBestThirds(rowsByGroup.map((item) => item.rows[2]).filter(Boolean))
      .slice(0, 2)
      .map((row) => row.team_id)
  );

  return (
    <AppShell>
      <section className="space-y-6">
        <div>
          <p className="text-sm font-bold uppercase text-gold-700">Fase de grupos</p>
          <h1 className="text-3xl font-black uppercase text-ink">Clasificacion</h1>
          <p className="mt-2 text-sm text-ink/60">
            Pasan primeros y segundos, mas los 2 mejores terceros. Desempates
            de mejores terceros: puntos, gol average, goles a favor y fair play.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {rowsByGroup.map(({ group, rows }) => {
            return (
              <article key={group.id} className="overflow-hidden rounded border border-line bg-white shadow-sm">
                <header className="flex items-center justify-between bg-ink px-4 py-3 text-white">
                  <h2 className="font-black uppercase">{group.name}</h2>
                </header>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-xs sm:text-sm">
                    <thead className="bg-fog text-xs uppercase text-ink/55">
                      <tr>
                        <th className="px-2 py-3 text-left">#</th>
                        <th className="px-2 py-3 text-left">Equipo</th>
                        <th className="px-2 py-3">PJ</th>
                        <th className="px-2 py-3">G</th>
                        <th className="px-2 py-3">E</th>
                        <th className="px-2 py-3">P</th>
                        <th className="px-2 py-3">DG</th>
                        <th className="px-2 py-3">Pts</th>
                        <th className="px-2 py-3">T</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, index) => {
                        const classified = index < 2 || bestThirdIds.has(row.team_id);
                        const badge =
                          index < 2
                            ? "Clasificado"
                            : bestThirdIds.has(row.team_id)
                              ? "Mejor tercero"
                              : null;

                        return (
                        <tr
                          key={row.team_id}
                          className={`border-t border-line ${
                            classified ? "bg-gold-50/60" : ""
                          }`}
                        >
                          <td className="px-2 py-3 font-black">
                            <span className={index < 2 ? "text-gold-700" : ""}>{index + 1}</span>
                          </td>
                          <td className="max-w-28 px-2 py-3 sm:max-w-none">
                            <div className="flex flex-col gap-1">
                              <span className="font-bold">{getTeamName(teams, row.team_id)}</span>
                              <span className="flex flex-wrap gap-1">
                                {badge ? (
                                  <span className="w-fit rounded bg-ink px-1.5 py-0.5 text-[10px] font-black uppercase text-gold-400">
                                    {badge}
                                  </span>
                                ) : null}
                              </span>
                            </div>
                          </td>
                          <td className="px-2 py-3 text-center">{row.played}</td>
                          <td className="px-2 py-3 text-center">{row.wins}</td>
                          <td className="px-2 py-3 text-center">{row.draws}</td>
                          <td className="px-2 py-3 text-center">{row.losses}</td>
                          <td className="px-2 py-3 text-center">{row.goal_difference}</td>
                          <td className="px-2 py-3 text-center font-black">{row.points}</td>
                          <td className="px-2 py-3 text-center">{row.card_points}</td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}
